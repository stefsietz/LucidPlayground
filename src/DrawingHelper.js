export function fillCanvasPixelsWithGreyAndAlpha (canvasPixels, greyData, width, height, channel=0, mult=1) {
  const cOffset = channel*width*height;
  for(let x=0; x<width; x++) {
    for(let y=0; y<height; y++) {
      const rgbaInd = (y*width + x) * 4;
      const greyInd =  cOffset + y*width + x;
      canvasPixels[rgbaInd] = greyData[greyInd]*mult;
      canvasPixels[rgbaInd+1] = greyData[greyInd]*mult;
      canvasPixels[rgbaInd+2] = greyData[greyInd]*mult;
      canvasPixels[rgbaInd+3] = 255;
    }
  }
}

export function fillCanvasPixelsWithRgbAndAlpha (canvasPixels, rgbData, width, height, channel=0, mult=1) {
  const cOffset = channel*width*height*3;
  for(let x=0; x<width; x++) {
    for(let y=0; y<height; y++) {
      const rgbaInd = (y*width + x) * 4;
      const rgbInd = cOffset + (y*width + x) * 3;
      canvasPixels[rgbaInd] = rgbData[rgbInd]*mult;
      canvasPixels[rgbaInd+1] = rgbData[rgbInd+1]*mult;
      canvasPixels[rgbaInd+2] = rgbData[rgbInd+2]*mult;
      canvasPixels[rgbaInd+3] = 255;
    }
  }
}

export function getRgbFromCanvasRgba (canvasPixels, rgbData, width, height) {
  for(let x=0; x<width; x++) {
    for(let y=0; y<height; y++) {
      const rgbaInd = (y*width + x) * 4;
      const rgbInd = (y*width + x) * 3;
      rgbData[rgbInd] = canvasPixels[rgbaInd];
      rgbData[rgbInd+1] = canvasPixels[rgbaInd+1];
      rgbData[rgbInd+2] = canvasPixels[rgbaInd+2];
    }
  }
}

export function getGrayFromCanvasRgba (canvasPixels, grayData, width, height) {
  for(let x=0; x<width; x++) {
    for(let y=0; y<height; y++) {
      const rgbaInd = (y*width + x) * 4;
      const rgbInd = (y*width + x);
      grayData[rgbInd] = canvasPixels[rgbaInd];
    }
  }
}

export function getImgDataFromFile(file, cb) {
  // FileReader support
  if (FileReader && file) {
      const fr = new FileReader();
      fr.onload = () => showImage(fr, cb);
      fr.readAsDataURL(file);
  }
}

function showImage(fileReader, cb) {
    var img = document.createElement("img");
    img.onload = () => cb(getImageData(img));
    img.src = fileReader.result;
}

export function getImageData(img) {
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return imageData
}
