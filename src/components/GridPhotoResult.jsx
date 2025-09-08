import React, { useState, useRef, useEffect } from 'react';

// Grid Photo Component
const GridPhotoPage = ({ photos, totalSquats, round1Count, round2Count, onBack, onShare, currentRound, squatCount, progressPercent }) => {
  const canvasRef = useRef(null);
  const [gridImage, setGridImage] = useState(null);

  useEffect(() => {
    generateGridImage();
  }, [photos]);

  const generateGridImage = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 400;
    canvas.height = 780;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const logoHeight = 80;
    const logoY = 10;
    
    const gridStartY = logoHeight + 20;
    const gridHeight = (canvas.height - gridStartY) * 0.75;
    const photoWidth = canvas.width / 2;
    const photoHeight = gridHeight / 2;
    
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    try {
      try {
        const logoImg = await loadImage('./assets/LOGO2 1.png');
        
        const logoAspectRatio = logoImg.width / logoImg.height;
        let logoDisplayWidth = canvas.width * 0.6;
        let logoDisplayHeight = logoDisplayWidth / logoAspectRatio;
        
        if (logoDisplayHeight > logoHeight - 20) {
          logoDisplayHeight = logoHeight - 20;
          logoDisplayWidth = logoDisplayHeight * logoAspectRatio;
        }
        
        const logoX = (canvas.width - logoDisplayWidth) / 2;
        const logoYPos = logoY + (logoHeight - logoDisplayHeight) / 2;
        
        ctx.drawImage(logoImg, logoX, logoYPos, logoDisplayWidth, logoDisplayHeight);
      } catch (logoError) {
        console.error('Error loading logo:', logoError);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('UNLOCK YOUR 100', canvas.width / 2, logoY + logoHeight / 2);
      }

      for (let i = 0; i < 4; i++) {
        if (photos[i]) {
          const img = await loadImage(photos[i]);
          const x = (i % 2) * photoWidth;
          const y = gridStartY + Math.floor(i / 2) * photoHeight;
          
          ctx.drawImage(img, x, y, photoWidth, photoHeight);

          // if (i === 0) {
          //   const bannerWidth = photoWidth * 0.85;
          //   const bannerX = x + (photoWidth - bannerWidth) / 2;
          //   const bannerHeight = 35;
          //   const bannerY = y + photoHeight * 0.55;
            
          //   ctx.fillStyle = '#FF0000';
          //   ctx.beginPath();
          //   ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8);
          //   ctx.fill();
            
          //   ctx.fillStyle = '#FFFFFF';
          //   ctx.font = 'bold 12px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.fillText('HYDRATE AND ENERGIZE', x + photoWidth/2, bannerY + 20);
            
          //   const gap = 5;
          //   const blackBannerY = bannerY + bannerHeight + gap;
          //   const blackBannerHeight = 25;
          //   const blackBannerWidth = photoWidth * 0.75;
          //   const blackBannerX = x + (photoWidth - blackBannerWidth) / 2;
            
          //   ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          //   ctx.beginPath();
          //   ctx.roundRect(blackBannerX, blackBannerY, blackBannerWidth, blackBannerHeight, 8);
          //   ctx.fill();
            
          //   ctx.fillStyle = '#FFFFFF';
          //   ctx.font = 'bold 9px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.fillText('BEFORE UNLOCK YOUR 100', x + photoWidth/2, blackBannerY + 15);
          // } 
          // else if (i === 1) {
          //   const counterAreaY = y + photoHeight * 0.55;
          //   const counterAreaHeight = photoHeight * 0.40;
            
          //   const actualCount = round1Count;
            
          //   const centerY = counterAreaY + counterAreaHeight/2;
            
          //   ctx.save();
          //   ctx.fillStyle = '#FFFFFF';
          //   ctx.font = 'bold 14px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.translate(x + 45, centerY - 20);
          //   ctx.rotate(-Math.PI / 2);
          //   ctx.fillText('ROUND 1', 0, 0);
          //   ctx.restore();
            
          //   ctx.fillStyle = '#FF0000';
          //   ctx.font = 'bold 50px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.fillText(actualCount.toString(), x + photoWidth/2 - 10, centerY - 8);
            
          //   ctx.fillStyle = '#FF0000';
          //   ctx.font = 'bold 16px Arial';
          //   ctx.textAlign = 'left';
          //   ctx.fillText('REP', x + photoWidth/2 + 25, centerY - 15);
          // }
          // else if (i === 2) {
          //   const bannerWidth = photoWidth * 0.85;
          //   const bannerX = x + (photoWidth - bannerWidth) / 2;
          //   const bannerHeight = 35;
          //   const bannerY = y + photoHeight * 0.55;
            
          //   ctx.fillStyle = '#FF0000';
          //   ctx.beginPath();
          //   ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8);
          //   ctx.fill();
            
          //   ctx.fillStyle = '#FFFFFF';
          //   ctx.font = 'bold 10px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.fillText('RECOVER & REPEAT STRONGER', x + photoWidth/2, bannerY + 20);
            
          //   const gap = 5;
          //   const blackBannerY = bannerY + bannerHeight + gap;
          //   const blackBannerHeight = 25;
          //   const blackBannerWidth = photoWidth * 0.75;
          //   const blackBannerX = x + (photoWidth - blackBannerWidth) / 2;
            
          //   ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          //   ctx.beginPath();
          //   ctx.roundRect(blackBannerX, blackBannerY, blackBannerWidth, blackBannerHeight, 8);
          //   ctx.fill();
            
          //   ctx.fillStyle = '#FFFFFF';
          //   ctx.font = 'bold 9px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.fillText("IT'S TIME TO", x + photoWidth/2, blackBannerY + 15);
          // }
          // else if (i === 3) {
          //   const counterAreaY = y + photoHeight * 0.55;
          //   const counterAreaHeight = photoHeight * 0.40;
            
          //   const actualCount = round2Count;
            
          //   const centerY = counterAreaY + counterAreaHeight/2;
            
          //   ctx.save();
          //   ctx.fillStyle = '#FFFFFF';
          //   ctx.font = 'bold 14px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.translate(x + 45, centerY - 20);
          //   ctx.rotate(-Math.PI / 2);
          //   ctx.fillText('ROUND 2', 0, 0);
          //   ctx.restore();
            
          //   ctx.fillStyle = '#FF0000';
          //   ctx.font = 'bold 50px Arial';
          //   ctx.textAlign = 'center';
          //   ctx.fillText(actualCount.toString(), x + photoWidth/2 - 10, centerY - 8);
            
          //   ctx.fillStyle = '#FF0000';
          //   ctx.font = 'bold 16px Arial';
          //   ctx.textAlign = 'left';
          //   ctx.fillText('REP', x + photoWidth/2 + 25, centerY - 15);
          // }
        }
      }
      
      const statsStartY = gridStartY + gridHeight;
      const statsHeight = canvas.height - statsStartY;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, statsStartY, canvas.width, statsHeight);
      
      const statsCenterX = canvas.width / 2;
      const statsCenterY = statsStartY + statsHeight / 2;
      
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'right';
      const countText = totalSquats.toString();
      ctx.fillText(countText, statsCenterX - 80, statsCenterY);

      ctx.save();
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'left';
      ctx.translate(statsCenterX - 60, statsCenterY + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SQUATS', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('/', statsCenterX - 10, statsCenterY);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('100', statsCenterX + 20, statsCenterY);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'left';
      ctx.translate(statsCenterX + 200, statsCenterY + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SECONDS', 0, 0);
      ctx.restore();
      
      const dataURL = canvas.toDataURL('image/png');
      setGridImage(dataURL);
      
    } catch (error) {
      console.error('Error generating grid image:', error);
    }
  };

  const handleShare = async () => {
    if (gridImage) {
      try {
        const response = await fetch(gridImage);
        const blob = await response.blob();
        
        const fileName = Math.random().toString(36).substring(2) + ".png";
        const filesArray = [new File([blob], fileName, { type: 'image/png' })];
        
        if (navigator.canShare && navigator.canShare({ files: filesArray })) {
          await navigator.share({
            files: filesArray,
          });
          console.log("Image shared successfully");
        } else {
          console.log("Web Share API not supported, falling back to download");
          const link = document.createElement('a');
          link.href = gridImage;
          link.download = fileName;
          link.click();
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing the image:', error);
          const fileName = Math.random().toString(36).substring(2) + ".png";
          const link = document.createElement('a');
          link.href = gridImage;
          link.download = fileName;
          link.click();
        }
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col" 
      style={{ maxWidth: 430, margin: "0 auto" }}
      >
      <div className="flex-1 mx-4 flex flex-col items-center justify-center">
        <div>
          <canvas 
            ref={canvasRef} 
            className="max-w-full h-auto border border-gray-600 rounded-lg"
            style={{ display: 'none' }}
          />
          {gridImage && (
            <img 
              src={gridImage} 
              alt="Squat Challenge Grid" 
              className="max-w-full h-auto"
            />
          )}
        </div>

        <button
          onClick={handleShare}
          className="bg-[#FF0000] -mt-10 w-full text-white py-2 px-8 rounded-[5px] font-bold hover:bg-[#FF0000] transition-colors flex items-center justify-center"
        >
          <span className="text-white text-[24px] font-vancouver font-regular">SHARE TO COLLECT POINTS</span>
        </button>
      </div>
    </div>
  );
};

export default GridPhotoPage;