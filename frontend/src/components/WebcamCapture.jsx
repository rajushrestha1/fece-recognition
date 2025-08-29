
import React, { useRef } from 'react';
import Webcam from 'react-webcam';

export default function WebcamCapture({ onCapture }) {
  const webcamRef = useRef(null);

  const capture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      onCapture && onCapture(imageSrc);
    }
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
