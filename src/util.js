/**
 * Reads json file content from URL and passes it to callback.
 * @param {*} file 
 * @param {*} callback 
 */
export function loadJSON(file, callback) {

  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(JSON.parse(xobj.responseText));
    }
  };
  xobj.send(null);
}

/**
 * Reads json file content from local file and passes it to callback.
 * @param {*} file 
 * @param {*} callback 
 */
export function loadJSONFromLocalFile(file, callback) {
  var reader = new FileReader();

  reader.onload = function(event) {
    var jsonObj = JSON.parse(event.target.result);
    callback(jsonObj);
  }

  reader.readAsText(file);
}