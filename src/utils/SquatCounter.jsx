// Simplified Squat Counter Class with Better Validation
export class SquatCounter {
  constructor() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.minFrames = 2;
    
    this.downKneeAngleThreshold = 135;
    this.upKneeAngleThreshold = 160;
    
    this.maxKneeAngleDifference = 25;
    this.minKneeBend = 30;
    
    this.standingKneeAngle = null;
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }

  isValidSquatPosition(leftKneeAngle, rightKneeAngle, avgKneeAngle, landmarks) {
    const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);
    if (kneeDifference > this.maxKneeAngleDifference) {
      return false;
    }

    if (this.standingKneeAngle === null) {
      if (avgKneeAngle >= 165) {
        this.standingKneeAngle = avgKneeAngle;
      }
      return false;
    }

    const kneeBend = this.standingKneeAngle - avgKneeAngle;
    if (avgKneeAngle <= this.downKneeAngleThreshold && kneeBend < this.minKneeBend) {
      return false;
    }

    // Check if knees are visible and properly positioned
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // Ensure knees are visible with good confidence
    if (leftKnee.visibility < 0.5 || rightKnee.visibility < 0.5) {
      return false;
    }
    
    // Check if knees are positioned below hips (proper squat form)
    if (leftKnee.y <= leftHip.y || rightKnee.y <= rightHip.y) {
      return false;
    }
    
    // Check if person is just bending forward (knees should be significantly bent)
    const leftHorizontalDistance = Math.abs(leftKnee.x - leftHip.x);
    const rightHorizontalDistance = Math.abs(rightKnee.x - rightHip.x);
    const minHorizontalDistance = 0.05;
    
    if (leftHorizontalDistance < minHorizontalDistance || rightHorizontalDistance < minHorizontalDistance) {
      return false;
    }

    // Check if body is facing forward (not sideways)
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    
    // If shoulders or hips are too narrow, person might be sideways
    const minBodyWidth = 0.08;
    if (shoulderWidth < minBodyWidth || hipWidth < minBodyWidth) {
      return false;
    }
    
    // Check if shoulders and hips are roughly aligned (not twisted)
    const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
    const hipCenter = (leftHip.x + rightHip.x) / 2;
    const bodyAlignment = Math.abs(shoulderCenter - hipCenter);
    
    // If body is too twisted/misaligned, reject
    const maxBodyMisalignment = 0.1;
    if (bodyAlignment > maxBodyMisalignment) {
      return false;
    }
    
    // Check if both knees are roughly at same horizontal level
    const kneeHeightDifference = Math.abs(leftKnee.y - rightKnee.y);
    const maxKneeHeightDiff = 0.05;
    if (kneeHeightDifference > maxKneeHeightDiff) {
      return false;
    }

    return true;
  }

  processPose(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { count: this.count, alert: "No landmarks detected" };
    }

    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];

    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
      return { count: this.count, alert: "Key landmarks missing" };
    }

    const minVisibility = 0.2;
    if (leftHip.visibility < minVisibility || leftKnee.visibility < minVisibility || 
        leftAnkle.visibility < minVisibility || rightHip.visibility < minVisibility || 
        rightKnee.visibility < minVisibility || rightAnkle.visibility < minVisibility) {
      return { count: this.count, alert: "Low landmark visibility" };
    }

    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);

    if (avgKneeAngle >= 165 && kneeDifference < 15) {
      this.standingKneeAngle = avgKneeAngle;
    }

    if (!this.isDown && avgKneeAngle <= this.downKneeAngleThreshold) {
      if (this.isValidSquatPosition(leftKneeAngle, rightKneeAngle, avgKneeAngle, landmarks)) {
        this.stateFrames++;
        if (this.stateFrames >= this.minFrames) {
          this.isDown = true;
          this.stateFrames = 0;
          return { count: this.count, isSquatDown: true };
        }
      } else {
        this.stateFrames = 0;
      }
    } 
    else if (this.isDown && avgKneeAngle >= this.upKneeAngleThreshold) {
      if (kneeDifference <= this.maxKneeAngleDifference) {
        this.stateFrames++;
        if (this.stateFrames >= this.minFrames) {
          this.isDown = false;
          this.count++;
          this.stateFrames = 0;
          return { count: this.count, newCount: true };
        }
      } else {
        this.stateFrames = 0;
      }
    } else {
      this.stateFrames = 0;
    }

    return { count: this.count, newCount: false, isSquatDown: this.isDown };
  }

  resetCount() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.standingKneeAngle = null;
  }
}