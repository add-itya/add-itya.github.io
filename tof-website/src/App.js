import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs';

import axios from 'axios';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const [handDistanceMessage, setHandDistanceMessage] = useState('Initializing');
  const [percent, setpercent] = useState('');
  

  const isRecordingRef = useRef(false);
  const [recordedData, setRecordedData] = useState([]);

  useEffect(() => {
    const loadHandPoseModel = async () => {
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig = { runtime: 'tfjs', modelType: 'full' };
      const detector = await handPoseDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
    };

    loadHandPoseModel();
  }, []);

  const captureAndProcessFrame = async () => {
    if (detectorRef.current && webcamRef.current && canvasRef.current) {
      const imageBase64 = webcamRef.current.getScreenshot();
      const img = new Image();
      img.src = imageBase64;

      img.onload = async () => {
        const hands = await detectorRef.current.estimateHands(img);
        const keypointsData = [];
        processHands(hands, keypointsData);
      };
    }
    requestAnimationFrame(captureAndProcessFrame);
  };

  function processHands(hands, keypointsData) {
    if (hands.length !== 0) {
      calculateHandDistance(hands);
      if (isRecordingRef.current) {
        recordHandData(hands, keypointsData);
      }
    } else {
      handleNoHandsDetected();
    }
  }

  function calculateHandDistance(hands) {
    const thumbLandmark = hands[0].keypoints[4];
    const pinkyLandmark = hands[0].keypoints[20];
    const distance = Math.sqrt(
      Math.pow(thumbLandmark.x - pinkyLandmark.x, 2) +
      Math.pow(thumbLandmark.y - pinkyLandmark.y, 2)
    );
    const tooCloseThreshold = 260;
    const tooFarThreshold = 110;
    if (distance > tooCloseThreshold) {
      setHandDistanceMessage('Hand is too close');
    } else if (distance < tooFarThreshold) {
      setHandDistanceMessage('Hand is too far');
    } else {
      setHandDistanceMessage('Hand in proper location');
    }
  }

  function handleNoHandsDetected() {
    setHandDistanceMessage('No Hand Detected');
    if (isRecordingRef.current) {
      alert("No hand detected");
      stopRecording();
    }
  }

  function recordHandData(hands, keypointsData) {
    keypointsData.push(
      hands[0].keypoints3D[4].x,
      hands[0].keypoints3D[4].y,
      hands[0].keypoints3D[4].z,
      hands[0].keypoints3D[20].x,
      hands[0].keypoints3D[20].y,
      hands[0].keypoints3D[20].z,
    );
    setRecordedData(prevData => [...prevData, keypointsData]);
  }

  const startRecording = () => {
    isRecordingRef.current = true;
    videoChunksRef.current = [];

    const stream = webcamRef.current.video.srcObject;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        videoChunksRef.current.push(event.data);
      }
    };
    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(videoBlob);

      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'hand_recording.webm';
      a.click();
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    console.log("Recording started");
  };

  async function stopRecording() {
    isRecordingRef.current = false;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    let data = { "landmarks": recordedData };
    setpercent(data)

    setRecordedData([]);
    return

    

  };

  useEffect(() => {
    requestAnimationFrame(captureAndProcessFrame);
    return () => {
      if (detectorRef.current) {
        detectorRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "environment" }} // Use back camera by default
      />
      <canvas ref={canvasRef} width={640} height={480} />
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        color: 'black',
        fontSize: '30px',
      }}>
        {handDistanceMessage}
      </div>
      <p>Results: {percent}</p>
      <button onClick={startRecording}>Start Recording</button>
      <button onClick={stopRecording}>Stop Recording</button>
    </div>
  );
}

export default App;
