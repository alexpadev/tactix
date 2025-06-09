import React, { useState, useRef, useEffect } from "react";
import { clearSvg, saveSvg, undoSvg } from "../layout/svg";

export default function Pizarra() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [drawHistory, setDrawHistory] = useState([]); 
  const [currentStroke, setCurrentStroke] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "http://localhost:3000/uploads/soccerField.jpg";
    img.onload = () => {
      setBackgroundImage(img);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, []);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startDrawing = ({ clientX, clientY }) => {
    const { x, y } = getMousePos({ clientX, clientY });
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    setDrawing(true);
    setCurrentStroke([{ x, y, color, lineWidth }]);
  };

  const draw = ({ clientX, clientY }) => {
    if (!drawing) return;
    const { x, y } = getMousePos({ clientX, clientY });
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (!drawing) return;
    setDrawing(false);
    setDrawHistory(prev => [...prev, [...currentStroke]]);
    setCurrentStroke([]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }
    setDrawHistory([]);
  };

  const undoLastDraw = () => {
    const newHistory = drawHistory.slice(0, -1);
    setDrawHistory(newHistory);
    redrawCanvas(newHistory);
  };

  const redrawCanvas = (history) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }
    history.forEach(stroke => {
      if (!stroke.length) return;
      const start = stroke[0];
      ctx.beginPath();
      ctx.strokeStyle = start.color;
      ctx.lineWidth = start.lineWidth;
      ctx.moveTo(start.x, start.y);
      stroke.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      ctx.closePath();
    });
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imageData;
    link.download = "pizarra.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h1 className="mb-4 text-gray-800 text-2xl font-bold">Pizarra</h1>
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
        <button
          className="p-2 rounded-full transition cursor-pointer hover:bg-gray-200"
          onClick={clearCanvas}
        >
          {clearSvg()}
        </button>
        <button
          className="p-2 rounded-full transition cursor-pointer hover:bg-gray-200"
          onClick={saveCanvas}
        >
          {saveSvg()}
        </button>
        <button
          className="p-2 rounded-full transition cursor-pointer hover:bg-gray-200"
          onClick={undoLastDraw}
        >
          {undoSvg()}
        </button>

        <label className="flex items-center gap-1 mt-2 sm:mt-0 sm:ml-4">
          Color:
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="ml-1"
          />
        </label>

        <label className="flex items-center gap-1 mt-2 sm:mt-0 sm:ml-4">
          Grosor:
          <input
            type="number"
            value={lineWidth}
            min={1}
            max={20}
            step={1}
            onChange={e => {
              const val = Number(e.target.value);
              setLineWidth(Math.max(1, Math.min(val, 20)));
            }}
            className="border border-gray-300 rounded-lg px-1 ml-1 w-[50px]"
          />
        </label>
      </div>

      <canvas
        ref={canvasRef}
        width={850}
        height={500}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={e => {
          e.preventDefault();
          const t = e.touches[0];
          startDrawing({ clientX: t.clientX, clientY: t.clientY });
        }}
        onTouchMove={e => {
          e.preventDefault();
          const t = e.touches[0];
          draw({ clientX: t.clientX, clientY: t.clientY });
        }}
        onTouchEnd={e => {
          e.preventDefault();
          stopDrawing();
        }}
        className="w-full max-w-[850px] h-auto rounded-lg border border-gray-300"
      />
    </div>
  );
}
