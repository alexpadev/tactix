import React, { useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { UserContext } from '../../context/UserContext';
import { useLocation, useParams } from 'react-router-dom';
import { loadingSvg } from '../layout/svg';
import Chat from '../chat/Chat';
import { useApi } from '../../hooks/useApi';

export default function ChatsList() {
  const { apiFetch } = useApi();
  const { token } = useContext(UserContext);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const location = useLocation();
  const { chatId: paramChatId } = useParams();
  const requestedChatId = paramChatId || location.state?.chatId;

  useEffect(() => {
    if (token) {
      try {
        const payload = jwtDecode(token);
        setCurrentUserId(payload.id || payload.userId || payload.sub);
      } catch (err) {
        console.error('Token inválido:', err);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!currentUserId) return;
    setLoadingChats(true);
    apiFetch(`/api/chats?userId=${currentUserId}`, {
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar chats');
        return res.json();
      })
      .then(data => {
        const filtered = data
          .filter(chat => !chat.isGroup)
          .filter(chat =>
            (chat.messages && chat.messages.some(
              m => m.from === currentUserId || m.to === currentUserId
            ))
            || chat._id === requestedChatId
          );

        setChats(filtered);

        if (requestedChatId) {
          const toSelect = filtered.find(c => c._id === requestedChatId);
          setSelectedChat(toSelect || null);
        }
      })
      .catch(err => {
        console.error('Error al cargar chats:', err);
      })
      .finally(() => {
        setLoadingChats(false);
      });
  }, [currentUserId, requestedChatId, apiFetch]);

  const handleSelect = chat => {
    setSelectedChat(chat);
  };

  return (
    <div>
      {/* ► Select desplegable sólo en móvil (<640px) */}
      <div className="block sm:hidden bg-gray-50 border-b border-gray-200 px-4 py-2">
        {loadingChats ? (
          <div className="flex justify-center">{loadingSvg()}</div>
        ) : (
          <select
            className="w-full p-2 rounded-md border border-gray-300 focus:outline-none"
            value={selectedChat?._id || ''}
            onChange={e => {
              const chat = chats.find(c => c._id === e.target.value);
              setSelectedChat(chat || null);
            }}
          >
            <option value="">Selecciona un chat...</option>
            {chats.map(chat => {
              const otherId = chat.participants.find(id => id !== currentUserId);
              const otherUser = chat.participantsInfo?.find(u =>
                u.id.toString() === otherId.toString()
              );
              const name = otherUser ? otherUser.nombre : `Usuario #${otherId}`;
              return (
                <option key={chat._id} value={chat._id}>
                  {name}
                </option>
              );
            })}
          </select>
        )}
      </div>

      <div className="flex">
        {/* ► Aside oculto en móvil, visible en sm+ */}
        <aside className="hidden sm:block w-1/3 bg-gray-50 border-r ml-20 mt-8 p-5 rounded-md border-gray-400 overflow-y-auto">
          <h2 className="p-4 text-xl font-semibold text-gray-800">Mis Chats</h2>
          {loadingChats ? (
            <div className="flex justify-center items-center py-10">
              {loadingSvg()}
            </div>
          ) : (
            <ul>
              {chats.map(chat => {
                const otherId = chat.participants.find(id => id !== currentUserId);
                const otherUser = chat.participantsInfo?.find(u =>
                  u.id.toString() === otherId.toString()
                );
                const name = otherUser ? otherUser.nombre : `Usuario #${otherId}`;
                const photo = otherUser?.foto || '/uploads/user_placeholder.png';
                const lastMsg = chat.messages.slice(-1)[0];

                return (
                  <li
                    key={chat._id}
                    className={`p-3 py-4 cursor-pointer hover:bg-[#ffd04f] rounded-md mb-2 ${
                      selectedChat?._id === chat._id ? 'bg-[#ffd04f]' : ''
                    }`}
                    onClick={() => handleSelect(chat)}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={`http://localhost:3000${photo}`}
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{name}</div>
                        <div className="text-sm text-gray-600">
                          Último mensaje:{' '}
                          {lastMsg
                            ? new Date(lastMsg.timestamp).toLocaleString()
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* ► Chat principal */}
        <main className="flex-1 p-4 mt-4">
          {selectedChat ? (
            <Chat chatId={selectedChat._id} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Selecciona un chat para empezar a chatear
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
