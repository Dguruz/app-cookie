"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import Cookie from 'js-cookie';

const CameraStream = () => {
   const imgRef = useRef<HTMLImageElement | null>(null);
   const [isStreamStarted, setIsStreamStarted] = useState(false);
   const [connectionStatus, setConnectionStatus] = useState("CONNECTING");
   const [activeConnections, setActiveConnections] = useState<number | null>(null);
  const [cookie, setCookie] = useState('xd');

   const { lastMessage, readyState, sendMessage } = useWebSocket("/py/ws", {
      shouldReconnect: () => true,
      reconnectInterval: 3000,
      onOpen: () => {
         console.log("WebSocket connection established");
         setConnectionStatus("OPEN");
         if (!isStreamStarted) {
            startStream();
         }
      },
      onClose: () => {
         console.log("WebSocket connection closed");
         setConnectionStatus("CLOSED");
      },
      onError: (error) => {
         console.error("WebSocket error:", error);
         setConnectionStatus("ERROR");
      },
   });

   const startStream = useCallback(async () => {
      try {
         const response = await fetch("/py/start", { method: "POST" });
         if (response.ok) {
            setIsStreamStarted(true);
            sendMessage("START_STREAM");
         } else {
            console.error("Failed to start stream");
         }
      } catch (error) {
         console.error("Error starting stream:", error);
      }
   }, [sendMessage]);

   useEffect(() => {
      if (readyState === ReadyState.OPEN && !isStreamStarted) {
         startStream();
      }
      return () => {
         const imgElement = imgRef.current;
         if (imgElement?.src) {
            URL.revokeObjectURL(imgElement.src);
         }
      };
   }, [readyState, isStreamStarted, startStream]);

   useEffect(() => {
      if (lastMessage) {
         // Handle different types of messages
         if (lastMessage.data instanceof Blob) {
            // Handle JPEG stream
            const url = URL.createObjectURL(lastMessage.data);
            if (imgRef.current) {
               // Revocar el URL antiguo para liberar memoria
               const oldSrc = imgRef.current.src;
               imgRef.current.src = url;
               if (oldSrc) {
                  URL.revokeObjectURL(oldSrc);
               }
            }
         } else if (typeof lastMessage.data === "string") {
            // Handle text message containing connection count
            const message = lastMessage.data;
            // Check if message is a number
            const connections = parseInt(message.replace("Active connections: ", ""), 10);
            if (!isNaN(connections)) {
               setActiveConnections(connections);
            }
         }
      }
   }, [lastMessage]);

   useEffect(() => {
      // Crear una cookie al cargar el componente
      // Cookie.set('miCookie', 'valorDeCookie', { expires: 7, path: '/' });
      //configurar esto:
      //Set - Cookie: session_id = abc123; SameSite = None; Secure
      Cookie.set('session_id', 'abc123', { SameSite: 'None', Secure: true ,Path: '/'});


      // También puedes leer la cookie si es necesario
     const valorCookie = Cookie.get('session_id');
      setCookie(valorCookie);
   }, []);

   return (
      <div className="max-w-2xl mx-auto border border-gray-200 rounded-lg p-4">
         <div className="mb-4 border-b border-gray-200 pb-2">
            <h2 className="text-2xl m-0">JPEG Stream</h2>
         <h1>{cookie}</h1>
         </div>
         <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
               <span className="text-sm text-gray-600">
                  Status: {connectionStatus}
               </span>
               {activeConnections !== null && (
                  <span className="text-sm text-gray-600">
                     Active Connections: {activeConnections}
                  </span>
               )}
            </div>
            <div className="relative bg-gray-100 pb-[56.25%] h-0 overflow-hidden">
               {readyState !== ReadyState.OPEN && (
                  <div className="absolute inset-0 flex items-center justify-center">
                     <span className="text-gray-600">{connectionStatus}...</span>
                  </div>
               )}
               <img
                  ref={imgRef}
                  alt="JPEG Stream"
                  className="absolute inset-0 w-full h-full object-contain"
                  loading="lazy" // Optimización para carga diferida
               />
            </div>
         </div>
      </div>
   );
};

export default CameraStream;