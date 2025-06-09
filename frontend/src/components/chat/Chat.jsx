import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { UserContext } from '../../context/UserContext';
import { useApi } from '../../hooks/useApi';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

export default function Chat({ chatId: propChatId }) {
  const { apiFetch } = useApi();
  const params = useParams();
  const chatId = propChatId || params.chatId;
  const { token } = useContext(UserContext);
  const wsRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [to, setTo] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [otherUser, setOtherUser] = useState({ nombre: '', foto: '' });
  const [currentUserInfo, setCurrentUserInfo] = useState({ nombre: '', foto: '' });
  const [users, setUsers] = useState({});
  const [isGroup, setIsGroup] = useState(false);

  const navigate = useNavigate();

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const payload = jwtDecode(token);
      return payload.id || payload.userId || payload.sub;
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (!currentUserId) return;
    apiFetch(`/api/users/${currentUserId}`,
      {
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error('User not found');
        return res.json();
      })
      .then(user => {
        setCurrentUserInfo({ nombre: user.nombre, foto: user.foto });
        setUsers(u => ({ ...u, [currentUserId]: { nombre: user.nombre, foto: user.foto } }));
      })
      .catch(err => console.error('Error fetching current user info:', err));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !chatId) return;
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`${WS_URL}/?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', userId: currentUserId, chatId }));
    };
    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        if (msg.from === currentUserId) return;
        if (!users[msg.from]) {
          apiFetch(`/api/users/${msg.from}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(u => setUsers(prev => ({ ...prev, [msg.from]: { nombre: u.nombre, foto: u.foto } })))
            .catch(() => {});
        }
        setMessages(prev => [...prev, msg]);
      } catch {
        console.error('Invalid WS message', data);
      }
    };
    ws.onerror = console.error;
    return () => ws.close();
  }, [currentUserId]);

  useEffect(() => {
    if (!chatId || !currentUserId) return;
    apiFetch(`/api/chats/${chatId}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Chat not found');
        return res.json();
      })
      .then(chat => {
        setMessages(chat.messages || []);
        setIsGroup(!!chat.isGroup);
        if (!chat.isGroup) {
          const other = chat.participants.find(id => id !== currentUserId);
          setTo(other.toString());
        } else {
          chat.participants.forEach(id => {
            if (!users[id]) {
              apiFetch(`/api/users/${id}`, { credentials: 'include' })
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(u => setUsers(prev => ({ ...prev, [id]: { nombre: u.nombre, foto: u.foto } })))
                .catch(() => {});
            }
          });
        }
      })
      .catch(() => navigate('/users'));
  }, [chatId]);

  useEffect(() => {
    if (isGroup || !to) return;
    apiFetch(`/api/users/${to}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('User not found');
        return res.json();
      })
      .then(user => {
        setOtherUser({ nombre: user.nombre, foto: user.foto });
        setUsers(u => ({ ...u, [to]: { nombre: user.nombre, foto: user.foto } }));
      })
      .catch(err => console.error('Error fetching user info:', err));
  }, [to, isGroup]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDownload = useCallback(async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  }, []);

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (!f) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('El archivo supera el tamaño máximo de 4 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(f);
    setError('');
  };

  const cancelFile = () => {
    setFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendFile = useCallback(async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch('/api/files', {
      method: 'POST', credentials: 'include', body: form
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Error subiendo fichero.');
      return;
    }
    const { filename, url, filesize } = await res.json();
    const payload = {
      type: 'file',
      chatId,
      from: currentUserId,
      ...(isGroup ? {} : { to: Number(to) }),
      content: url,
      filename,
      filesize,
      timestamp: Date.now()
    };
    wsRef.current.send(JSON.stringify(payload));
    setMessages(prev => [...prev, payload]);
    cancelFile();
  }, [file, to, chatId, currentUserId, isGroup, cancelFile]);

  const sendMessage = useCallback(e => {
    e.preventDefault();
    if (file) return sendFile();
    if (!content.trim()) return;
    const payload = {
      type: 'chat',
      chatId,
      from: currentUserId,
      ...(isGroup ? {} : { to: Number(to) }),
      content: content.trim(),
      timestamp: Date.now()
    };
    wsRef.current.send(JSON.stringify(payload));
    setMessages(prev => [...prev, payload]);
    setContent('');
  }, [file, content, chatId, to, currentUserId, isGroup, sendFile]);

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !file) sendMessage(e);
  };

  return (
    <div className="flex flex-col max-w-7xl mx-auto p-4 bg-[#ffd04f] rounded-lg">
      <header className="mb-4 flex items-center space-x-4">
        {isGroup ? (
          <h2 className="text-2xl font-bold text-gray-800">Chat grupal</h2>
        ) : (
          <> 
            <img
              src={"http://localhost:3000" + (otherUser.foto || "/uploads/user_placeholder.png")}
              alt={otherUser.nombre || `Usuario #${currentUserId}`}
              className="w-10 h-10 rounded-full object-cover"
            />
            <h2 className="text-2xl font-bold text-gray-800">
              {otherUser.nombre || "Cargando usuario..."}
            </h2>
          </>
        )}
      </header>

      <div ref={containerRef} className="h-150 overflow-y-auto p-4 bg-white rounded-lg">
        {messages.map((m, i) => {
          const isMine = m.from === currentUserId;
          const sender = users[m.from] || { nombre: isMine ? 'Tú' : 'Desconocido', foto: '' };
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
              <div className="flex items-start space-x-2">
                <img
                  src={"http://localhost:3000" + (sender.foto || "/uploads/user_placeholder.png")}
                  alt={sender.nombre}
                  className="w-6 h-6 rounded-full object-cover mt-1"
                />
                <div className={`${isMine ? 'bg-[#ffd04f] text-gray-800' : 'bg-gray-100 text-gray-800'} break-words max-w-md px-4 py-2 rounded-lg`}>
                  <div className="text-xs font-semibold mb-1 flex items-center">
                    <span>{sender.nombre}</span>
                    <span className="ml-2 text-gray-500 text-[9px] mt-0.5">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {m.type === 'file' ? (
                    /\.(jpe?g|png|gif|webp)$/i.test(m.filename) ? (
                      <div className="flex">
                      <img
                        src={m.content}
                        alt={m.filename}
                        className="max-h-60 rounded-lg object-cover"
                      />
                        {/* <button
                          onClick={() => handleDownload(m.content, m.filename)}
                          className="rounded cursor-pointer hover:text-gray-700"
                        >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-6 h-6"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12" />
                        </svg>
                        </button> */}
                        </div>
                     
                      
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg 
                        width="22"
                        height="22"
                        viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier"> 
                          <path 
                            d="M19 9V17.8C19 18.9201 19 19.4802 18.782 19.908C18.5903 20.2843 18.2843 20.5903 17.908 20.782C17.4802 21 16.9201 21 15.8 21H8.2C7.07989 21 6.51984 21 6.09202 20.782C5.71569 20.5903 5.40973 20.2843 5.21799 19.908C5 19.4802 5 18.9201 5 17.8V6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51984 3 7.0799 3 8.2 3H13M19 9L13 3M19 9H14C13.4477 9 13 8.55228 13 8V3" 
                            stroke="#242424" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round">
                          </path>
                        </g>
                      </svg>
                      <a
                        href={m.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-800 font-semibold hover:text-gray-700 underline"
                      >
                        {m.filename}
                      </a>
                      <button
                        onClick={() => handleDownload(m.content, m.filename)}
                        className="rounded cursor-pointer hover:text-gray-700"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12" />
                        </svg>
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-sm">{m.content}</p>
                )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="mt-4">
        {file ? (
          <button type="button" onClick={sendFile} className="w-full py-2 bg-gray-800 text-white rounded-lg font-semibold cursor-pointer hover:bg-gray-900 transition">
            Subir archivo
          </button>
        ) : (
          <div className="relative flex items-center">
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="w-full p-2 rounded-md px-13 bg-white"
            />
            <button type="submit" className="absolute right-2 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="" className="w-6 h-6 text-gray-800">
                <path d="M2.01 21l20.99-9L2.01 3v7l15 2-15 2z" />
              </svg>
            </button>
            <label className="absolute left-2 cursor-pointer" htmlFor="fileInput">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                width="32"
                height="32"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12.75 9C12.75 8.58579 12.4142 8.25 12 8.25C11.5858 8.25 11.25 8.58579 11.25 9L11.25 11.25H9C8.58579 11.25 8.25 11.5858 8.25 12C8.25 12.4142 8.58579 12.75 9 12.75H11.25V15C11.25 15.4142 11.5858 15.75 12 15.75C12.4142 15.75 12.75 15.4142 12.75 15L12.75 12.75H15C15.4142 12.75 15.75 12.4142 15.75 12C15.75 11.5858 15.4142 11.25 15 11.25H12.75V9Z"
                    fill="#242424"
                  ></path>
                </g>
              </svg>
            </label>
            <input id="fileInput" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>
        )}
        {error && <div className="text-red-600 text-sm mt-2">⚠️ {error}</div>}
      </form>

      {file && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="truncate">{file.name} ({Math.round(file.size/1024)} KB)</span>
          <button onClick={cancelFile}><p className="font-bold text-gray-700 cursor-pointer">X</p></button>
        </div>
      )}
    </div>
  );
}
