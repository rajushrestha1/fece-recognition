import React, { useRef } from 'react';
import Webcam from 'react-webcam';

export default function WebcamCapture({ onCapture }) {
  const webcamRef = useRef(null);

  const capture = () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    // Convert base64 string to File object
    const byteString = atob(imageSrc.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

    const blob = new Blob([ab], { type: 'image/jpeg' });
    const file = new File([blob], `face_${Date.now()}.jpg`, { type: 'image/jpeg' });

    onCapture && onCapture(file); // send File to parent
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className="rounded-xl border shadow w-full max-w-md"
        videoConstraints={{ facingMode: 'user' }}
      />
      <button
        onClick={capture}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        Capture & Login
      </button>
    </div>
  );
}
