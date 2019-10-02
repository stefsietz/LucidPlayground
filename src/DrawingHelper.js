
/**
 * Replicates grey pixel array into rgba canvas pixel array.
 * @param {*} canvasPixels rgba pixel array
 * @param {*} greyData single channel pixel array
 * @param {*} width 
 * @param {*} height 
 * @param {*} channel channel offset in case input contains multiple concatenated channels
 * @param {*} mult multiply src pixel data (e.g. to convert from normalized 0-1 to 0-255)
 */
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

/**
 * Writes rgb pixel array into rgba canvas pixel array.
 * @param {*} canvasPixels rgba pixel array
 * @param {*} rgbData rgb pixel array
 * @param {*} width 
 * @param {*} height 
 * @param {*} channel channel offset
 * @param {*} mult multiply src pixel data (e.g. to convert from normalized 0-1 to 0-255)
 */
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

/**
 * Converts rgba pixel array to rgb pixel array.
 * @param {*} canvasPixels rgba pixel array
 * @param {*} rgbData rgb pixel array to write into
 * @param {*} width 
 * @param {*} height 
 */
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

/**
 * Puts red channel of rgba pixel array into single channel pixel array.
 * @param {*} canvasPixels rgba pixel array
 * @param {*} grayData single channel pixel array 
 * @param {*} width 
 * @param {*} height 
 */
export function getGrayFromCanvasRgba (canvasPixels, grayData, width, height) {
  for(let x=0; x<width; x++) {
    for(let y=0; y<height; y++) {
      const rgbaInd = (y*width + x) * 4;
      const rgbInd = (y*width + x);
      grayData[rgbInd] = canvasPixels[rgbaInd];
    }
  }
}

/**
 * Passes ImageData object from image file to callback
 * @param {*} file image file
 * @param {*} cb callback
 */
export function getImgDataFromFile(file, cb) {
  // FileReader support
  if (FileReader && file) {
      const fr = new FileReader();
      fr.onload = () => showImage(fr, cb);
      fr.readAsDataURL(file);
  }
}

/**
 * Creates image element from FileReader.
 * @param {*} fileReader 
 * @param {*} cb 
 */
function showImage(fileReader, cb) {
    var img = document.createElement("img");
    img.onload = () => cb(getImageData(img));
    img.src = fileReader.result;
}

/**
 * Returns ImageData object from image element.
 * @param {*} img html image element
 */
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
