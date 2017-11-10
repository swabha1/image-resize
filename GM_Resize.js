/* Dependency's */
var exec = require('child_process').exec;
var json2csv = require('json2csv');
var fs = require('fs');
var gm = require('gm');
var THUMBNAIL_MAX_DIM = 150;
var STANDARD_MAX_DIM = 1024; 
var IMAGE_PERFORMANCE_FIELDS = ['Image-Name', 'File-Type', 'File-Size', 'Converted-File-Size', 'Conversion-Time'];
var imagePerfomanceRecordsGM = [];

var getImageNameWOExt = function(imageName){
  return imageName.split(".")[0];
}

var getImageExtension = function(imageName){
  return imageName.split(".")[1];
}

var getSourceImgBasePath = function(){
  var basePath = __dirname + '/public/Images/source/'; 
  basePath = basePath.replace(/\\/g, "\\\\").replace(/\//g, "\\\\");
  return basePath;
}

var getSourceImgSrc = function(imageName){
  var sourceBasePath = getSourceImgBasePath(); 
  return sourceBasePath+imageName;
}

var getCombinePathOfImg = function(basePath, imageName){
  basePath = basePath.replace(/\\/g, "\\\\").replace(/\//g, "\\\\");
  var imageNameWithoutExt = getImageNameWOExt(imageName);
  var imageExtension = getImageExtension(imageName);
  //var targetImgExt = (imageExtension == "ai" || imageExtension == "eps" ||  imageExtension == "svg" ||  imageExtension == "pdf") ?  ".png" : ("." + imageExtension);
  var targetImgExt = ".png";
  return basePath + imageNameWithoutExt + targetImgExt;
}


var resizeImageToDimViaGM = function(sourceImgSrc, targetImgSrc, dim, callback){
  try{
    var resizeTimeStart = new Date();  
       var resizeCmd = "gm convert -scale "+dim+" "+sourceImgSrc+" -quality 10 "+targetImgSrc;
        exec(resizeCmd, function(err) {
          var resizeTime = new Date() - resizeTimeStart;
          if (err) {
            callback({ "sourceImg":sourceImgSrc, "convertedImg": targetImgSrc, "resizeTime" : resizeTime, "errorCmd" : resizeCmd, "error": err});
          } 
          else{
              callback({ "sourceImg":sourceImgSrc, "convertedImg": targetImgSrc, "resizeTime" : resizeTime, "errorCmd" : null, "error": null});
          }
        }); 
  }
  catch(err){
    callback('', err);
  }
}

var getThumbPathForGM = function(imageName){
  var basePath = __dirname + '/public/Images/converted/GM/Thumbnail/';
  return getCombinePathOfImg(basePath, imageName);
}

var getStdPathForGM = function(imageName){
  var basePath = __dirname + '/public/Images/converted/GM/Standard/';
  return getCombinePathOfImg(basePath, imageName);
}

var resizeImageToThumbViaGM = function(imageName, callback) { 
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getThumbPathForGM(imageName);
  resizeImageToDimViaGM(sourceImgSrc, targetImgSrc, THUMBNAIL_MAX_DIM, callback);
}

var resizeImageToStdViaGM = function(imageName, callback) {
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getStdPathForGM(imageName);
  resizeImageToDimViaGM(sourceImgSrc, targetImgSrc, STANDARD_MAX_DIM, callback);
}

var getFilesizeInKiloBytes = function(filename) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return (fileSizeInBytes / 1000);
}

var getPerformanceObj = function(imageName, result, err, resizeTimeStart){
  var performanceObj = {};
  performanceObj['Image-Name'] = imageName;
  performanceObj['File-Type'] = getImageExtension(imageName);
  performanceObj['File-Size'] = getFilesizeInKiloBytes(getSourceImgSrc(imageName));
  if(err){
    performanceObj['Converted-File-Size'] = 'Error';
    performanceObj['Conversion-Time'] = 'Error';
      //console.log('Error while resizing file which have name '+ fileName + ' ..', result);
  }else{
    performanceObj['Converted-File-Size'] = getFilesizeInKiloBytes(result);
    performanceObj['Conversion-Time'] = resizeTimeStart;
    //console.log('File resized succesfully..');
  }
  return performanceObj;
}

var recordPerformance = function(fields, record, fileName){
  var toCsv = {
    data: record,
    fields: fields,
    hasCSVColumnTitle: false
  };
  var newLine= "\r\n";
  fs.stat(fileName, function (err, stat) {
    if (err == null) {
        var csv = json2csv(toCsv) + newLine;
        fs.appendFile(fileName, csv, function (err) {
            if (err) throw err;
        });
    }
    else {
        //write the headers and newline
        fields= (fields + newLine);
        fs.writeFile(fileName, fields, function (err, stat) {
            if (err) throw err;   
            var csv = json2csv(toCsv) + newLine;
            fs.appendFile(fileName, csv, function (err) {
                if (err) throw err;
            }); 
        });
    }
});
}

var imageNameArr = null;

function gmThumbCallback(resultObj) {
  //{ "sourceImg":sourceImgSrc, "convertedImg": targetImgSrc, "resizeTime" : resizeTime, "errorCmd" : resizeCmd, "error": err}
    var sourceImg = resultObj.sourceImg.replace(/^.*[\\\/]/, '');
    var convertedImg = resultObj.convertedImg;
    var error = resultObj.error;
    var resizeTimeStart = resultObj.resizeTime;

    var performanceObj = getPerformanceObj(sourceImg, convertedImg, error, resizeTimeStart);
    imagePerfomanceRecordsGM.push(performanceObj);
    if(imageNameArr.length > 0) {

      resizeImageToThumbViaGM(imageNameArr.shift(), gmThumbCallback);
    }
    else {
      recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsGM, 'GM_Thumbnail_Performace.csv');
    }
}

var readFilesFromDir = function(dirname, onFileNames, onError) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    onFileNames(filenames);
    return;
  });
}

var sourceDir = getSourceImgBasePath();
readFilesFromDir(sourceDir, (imageNames)=>{
  imageNameArr = imageNames;
  resizeImageToThumbViaGM(imageNameArr.shift(), gmThumbCallback);
});















