import { playAnnouncement } from './AudioUtils';

// Position Validator Class
export class PositionValidator {
  constructor() {
    this.isPositionValid = false;
    this.validFrames = 0;
    this.requiredValidFrames = 10; // Reduced from 15 untuk lebih responsif
    this.hasSpokenPositionGood = false;
  }

  validatePosition(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      this.validFrames = 0;
      this.isPositionValid = false;
      this.hasSpokenPositionGood = false;
      return { isValid: false, message: "No person detected" };
    }

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    // Check if key landmarks are visible
    const keyLandmarks = [leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
    const minVisibility = 0.4; // Reduced from 0.5 untuk toleransi lebih baik
    
    for (let landmark of keyLandmarks) {
      if (!landmark || landmark.visibility < minVisibility) {
        this.validFrames = 0;
        this.isPositionValid = false;
        this.hasSpokenPositionGood = false;
        return { isValid: false, message: "Step back so your whole body is visible" };
      }
    }

    // More lenient body frame checking
    const minY = Math.min(leftShoulder.y, rightShoulder.y);
    const maxY = Math.max(leftAnkle.y, rightAnkle.y);
    const minX = Math.min(leftShoulder.x, rightShoulder.x, leftHip.x, rightHip.x, leftKnee.x, rightKnee.x, leftAnkle.x, rightAnkle.x);
    const maxX = Math.max(leftShoulder.x, rightShoulder.x, leftHip.x, rightHip.x, leftKnee.x, rightKnee.x, leftAnkle.x, rightAnkle.x);

    // More lenient frame boundaries
    if (minY < 0.02 || maxY > 0.98 || minX < 0.02 || maxX > 0.98) {
      this.validFrames = 0;
      this.isPositionValid = false;
      this.hasSpokenPositionGood = false;
      return { isValid: false, message: "Step back so your whole body is visible" };
    }

    // More lenient body width checking
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const minBodyWidth = 0.06; // Reduced from 0.08
    
    if (shoulderWidth < minBodyWidth || hipWidth < minBodyWidth) {
      this.validFrames = 0;
      this.isPositionValid = false;
      this.hasSpokenPositionGood = false;
      return { isValid: false, message: "Face the camera and get into position" };
    }

    // More lenient body alignment
    const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
    const hipCenter = (leftHip.x + rightHip.x) / 2;
    const bodyAlignment = Math.abs(shoulderCenter - hipCenter);
    const maxBodyMisalignment = 0.12; // Increased from 0.08
    
    if (bodyAlignment > maxBodyMisalignment) {
      this.validFrames = 0;
      this.isPositionValid = false;
      this.hasSpokenPositionGood = false;
      return { isValid: false, message: "Stand straight and face the camera" };
    }

    // Position looks good, increment valid frames
    this.validFrames++;
    
    // Speak "Perfect position" when close to valid but not yet confirmed
    if (this.validFrames >= 5 && !this.hasSpokenPositionGood) {
      this.hasSpokenPositionGood = true;
      // Use the improved audio system
      playAnnouncement("Perfect position! Hold steady!");
    }
    
    if (this.validFrames >= this.requiredValidFrames) {
      this.isPositionValid = true;
      return { isValid: true, message: "Perfect position! Ready to start!" };
    } else {
      return { isValid: false, message: "Hold your position..." };
    }
  }

  reset() {
    this.isPositionValid = false;
    this.validFrames = 0;
    this.hasSpokenPositionGood = false;
  }
}