/* Dependency's */
var exec = require('child_process').exec;
var json2csv = require('json2csv');
var fs = require('fs');
var cluster = require('cluster');
var gm = require('gm');
var THUMBNAIL_MAX_DIM = 150;
var STANDARD_MAX_DIM = 1024; 
var IMAGE_PERFORMANCE_FIELDS = ['Image-Name', 'File-Type', 'File-Size', 'Converted-File-Size', 'Conversion-Time'];
var imagePerfomanceRecordsIM = [];
var imagePerfomanceRecordsGM = [];
var imagePerfomanceRecordsVIPS = [];
var iterationCounterIM = 0;
var iterationCounterGM = 0;
var iterationCounterVIPS = 0;
var TECHNOLOGY_PERFORMANCE_FIELDS = ['Tech-Name', 'Dimension-Type', 'Conversion-Time'];
var technologyPerformaceRecord = [];


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

var resizeImageToDimViaIM = function(sourceImgSrc, targetImgSrc, dim, callback){
  try{
       var resizeCmd = "convert -resize "+dim+" "+sourceImgSrc+" -quality 10 -define PNG:compression-level=9 "+targetImgSrc;
        exec(resizeCmd, function(err) {
          if (err) {
            callback(resizeCmd, err);
          } 
          else{
              callback(targetImgSrc);
          }
        }); 
  }
  catch(err){
    callback('', err);
  }
}



var resizeImageToDimViaVIPS = function(sourceImgSrc, targetImgSrc, maxDim, callback){
  try{
      getImgDim(sourceImgSrc, (imageDim, err) => {
        var sourceImgMaxDim = null;
        if(err){
          sourceImgMaxDim = maxDim;
          //console.log('Error while getting image dimensions!', sourceImgSrc);
        }
        else{
          sourceImgMaxDim = (imageDim.width > imageDim.height) ? imageDim.width : imageDim.height;
        }
        var scaleFactor = maxDim / sourceImgMaxDim;
        //vips resize E:\Node-Projects\colorization-vips\cap.png E:\Node-Projects\colorization-vips\cap_thumb_vips.png 0.1071 (targetW / sourceW)
        var resizeCmd = "vips resize "+sourceImgSrc+" "+targetImgSrc+" "+scaleFactor;
        exec(resizeCmd, function(err) {
          if (err) {
            callback(resizeCmd, err);
          } 
          else{
              callback(targetImgSrc);
          }
        });
      });
     
  }
  catch(err){
    callback('', err);
  }
}

var resizeImageToThumbViaIM = function(imageName, callback) {
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getThumbPathForIM(imageName);
  resizeImageToDimViaIM(sourceImgSrc, targetImgSrc, THUMBNAIL_MAX_DIM, callback);
}

var resizeImageToStdViaIM = function(imageName, callback) {
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getStdPathForIM(imageName);
  resizeImageToDimViaIM(sourceImgSrc, targetImgSrc, STANDARD_MAX_DIM, callback);
}



var resizeImageToThumbViaVIPS = function(imageName, callback) {
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getThumbPathForVIPS(imageName);
  resizeImageToDimViaVIPS(sourceImgSrc, targetImgSrc, THUMBNAIL_MAX_DIM, callback);
}

var resizeImageToStdViaVIPS = function(imageName, callback) {
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getStdPathForVIPS(imageName);
  resizeImageToDimViaVIPS(sourceImgSrc, targetImgSrc, STANDARD_MAX_DIM, callback);
}


// Helper Methods
var getFilesizeInKiloBytes = function(filename) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return (fileSizeInBytes / 1000);
}

var getImgDim = function(imagePath, callback){
  gm(imagePath)
  .size(function (err, size) {
    if (!err) {
      callback ({width :  size.width, height: size.height});
    }
    else{
      callback ('', err);
    }
  });
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


var getSourceImgBasePath = function(){
  var basePath = __dirname + '/public/Images/source/'; 
  basePath = basePath.replace(/\\/g, "\\\\").replace(/\//g, "\\\\");
  return basePath;
}

var getBasePath = function(path){
  var basePath = __dirname + path; 
  basePath = basePath.replace(/\\/g, "\\\\").replace(/\//g, "\\\\");
  return basePath;
}

var getSourceImgSrc = function(imageName){
  var sourceBasePath = getSourceImgBasePath(); 
  return sourceBasePath+imageName;
}



var getImageNameWOExt = function(imageName){
  return imageName.split(".")[0];
}

var getImageExtension = function(imageName){
  return imageName.split(".")[1];
}

var getThumbPathForIM = function(imageName){
  var basePath = __dirname + '/public/Images/converted/IM/Thumbnail/';
  return getCombinePathOfImg(basePath, imageName);
}


var getStdPathForGM = function(imageName){
  var basePath = __dirname + '/public/Images/converted/GM/Standard/';
  return getCombinePathOfImg(basePath, imageName);
}

var getThumbPathForVIPS = function(imageName){
  var basePath = __dirname + '/public/Images/converted/VIPS/Thumbnail/';
  return getCombinePathOfImg(basePath, imageName);
}

var getStdPathForVIPS = function(imageName){
  var basePath = __dirname + '/public/Images/converted/VIPS/Standard/';
  return getCombinePathOfImg(basePath, imageName);
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

var resizeImageViaIM = function(imageName, count, isThumb){
    var resizeTimeStart = new Date();  

    if(isThumb){
      resizeImageToThumbViaIM(imageName, (result, err)=>{
        var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
        imagePerfomanceRecordsIM.push(performanceObj);
        iterationCounterIM++;
        if(iterationCounterIM == count-1){
          recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsIM, 'IM_Thumbnail_Performace.csv');
        }
      });
    }
    else{
      resizeImageToStdViaIM(imageName, (result, err, isThumb)=>{
        var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
        imagePerfomanceRecordsIM.push(performanceObj);
        iterationCounterIM++;
        if(iterationCounterIM == count-1){
          recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsIM, 'IM_Standard_Performace.csv');
        }
      });
    }
}

var resizeImageViaGM = function(imageName, count, isThumb){
  var resizeTimeStart = new Date(); 
  if(isThumb){
    resizeImageToThumbViaGM(imageName, (result, err)=>{
        var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
        imagePerfomanceRecordsGM.push(performanceObj);
        iterationCounterGM++;
        if(iterationCounterGM == count-1){
          recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsGM, 'GM_Thumbnail_Performace.csv');
        }
    });
  }
  else{
    resizeImageToStdViaGM(imageName, (result, err)=>{
      var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
      imagePerfomanceRecordsGM.push(performanceObj);
      iterationCounterGM++;
      if(iterationCounterGM == count-1){
        recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsGM, 'GM_Standard_Performace.csv');
      }
    });
  }
}

var resizeImageViaVIPS = function(imageName, count, isThumb){
  var resizeTimeStart = new Date();  
  if(isThumb){
      resizeImageToThumbViaVIPS(imageName, (result, err)=>{
        var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
        imagePerfomanceRecordsVIPS.push(performanceObj);
        iterationCounterVIPS++;
        if(iterationCounterVIPS == count-1){
          recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsVIPS, 'VIPS_Thumbnail_Performace.csv');
        }
      });
  }
  else{
      resizeImageToStdViaVIPS(imageName, (result, err)=>{
        var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
        imagePerfomanceRecordsVIPS.push(performanceObj);
        iterationCounterVIPS++;
        if(iterationCounterVIPS == count-1){
          recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsVIPS, 'VIPS_Standard_Performace.csv');
        }
      });
  }
}


var processBatchUsingIM = function(targetDir, sourceDir, dim, callback){
  try{
      
       var batchCmd = "mogrify -path "+targetDir+" -sample "+dim+" -quality 10 -define PNG:compression-level=9 -format png *.*";
        exec(batchCmd, {cwd: sourceDir}, function(err) {
          if (err) {
            callback(batchCmd, err);
          } 
          else{
              callback("");
          }
        }); 
  }
  catch(err){
    callback('', err);
  }
}


var processBatchUsingGM = function(targetDir, sourceDir, dim, callback){
  try{
      
       var batchCmd = "gm mogrify -output-directory "+targetDir+" -sample "+dim+" -quality 10 -format png *.*";
        exec(batchCmd, {cwd: sourceDir}, function(err) {
          if (err) {
            callback(batchCmd, err);
          } 
          else{
              callback('');
          }
        }); 
  }
  catch(err){
    callback('', err);
  }
}

var processThumbViaBatchIM = function(){
    var sourceDir = getSourceImgBasePath();
    var targetDir = getBasePath('/public/Images/converted/IM/Thumbnail/');
    var resizeTimeStart = new Date();  
    processBatchUsingIM(targetDir, sourceDir, THUMBNAIL_MAX_DIM, (result, err)=>{
      if(err){
        var totalResizeTime = new Date() - resizeTimeStart;
          console.log('Error while resizing file which have name ..', totalResizeTime);
      }else{
        var totalResizeTime = new Date() - resizeTimeStart;
        console.log('all File resized succesfully..', totalResizeTime);
      }
    });
}

var processStdViaBatchIM = function(){
  var sourceDir = getSourceImgBasePath();
  var targetDir = getBasePath('/public/Images/converted/IM/Standard/');
  var resizeTimeStart = new Date();  

  processBatchUsingIM(targetDir, sourceDir, STANDARD_MAX_DIM, (result, err)=>{
    if(err){
      var totalResizeTime = new Date() - resizeTimeStart;
        console.log('Error while resizing file which have name ..', totalResizeTime);
    }else{
      var totalResizeTime = new Date() - resizeTimeStart;
      console.log('all File resized succesfully..', totalResizeTime);
    }
  });
}

var processThumbViaBatchGM = function(){
  var sourceDir = getSourceImgBasePath();
  var targetDir = getBasePath('/public/Images/converted/GM/Thumbnail/');
  var resizeTimeStart = new Date();  

  processBatchUsingGM(targetDir, sourceDir, THUMBNAIL_MAX_DIM, (result, err)=>{
    if(err){
      var totalResizeTime = new Date() - resizeTimeStart;
        console.log('Error while resizing file which have name ..', totalResizeTime);
    }else{
      var totalResizeTime = new Date() - resizeTimeStart;
      console.log('all File resized succesfully..', totalResizeTime);
    }
  });
}


var processStdViaBatchGM = function(){
  var sourceDir = getSourceImgBasePath();
  var targetDir = getBasePath('/public/Images/converted/GM/Standard/');
  var resizeTimeStart = new Date();  

  processBatchUsingGM(targetDir, sourceDir, STANDARD_MAX_DIM, (result, err)=>{
    if(err){
      var totalResizeTime = new Date() - resizeTimeStart;
        console.log('Error while resizing file which have name ..', totalResizeTime);
    }else{
      var totalResizeTime = new Date() - resizeTimeStart;
      console.log('all File resized succesfully..', totalResizeTime);
    }
  });
}


var resizeUsingNodeGM = function(sourceImgSrc, targetImgSrc, maxDim, callback){  
  gm(sourceImgSrc)
  .sample(maxDim)
  .quality(10) 
  .write(targetImgSrc, function (err) {
    if (!err){
      callback(targetImgSrc);
    } 
    else{
      callback(sourceImgSrc, err);
    }
  });
}

var resizeImageToThumbViaGMNode = function(imageName, callback) {
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getThumbPathForGM(imageName);
  resizeUsingNodeGM(sourceImgSrc, targetImgSrc, THUMBNAIL_MAX_DIM, callback);
}

var resizeImageToStdViaGMNode = function(imageName, callback) {
  var sourceImgSrc = getSourceImgSrc(imageName); 
  var targetImgSrc = getStdPathForGM(imageName);
  resizeUsingNodeGM(sourceImgSrc, targetImgSrc, STANDARD_MAX_DIM, callback);
}

var resizeImageViaGMNode = function(imageName, count, isThumb){
  var resizeTimeStart = new Date(); 
  if(isThumb){
    resizeImageToThumbViaGMNode(imageName, (result, err)=>{
        var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
        imagePerfomanceRecordsGM.push(performanceObj);
        iterationCounterGM++;
        if(iterationCounterGM == count-1){
          recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsGM, 'GM_node_Thumbnail_Performace.csv');
        }
    });
  }
  else{
    resizeImageToStdViaGMNode(imageName, (result, err)=>{
      var performanceObj = getPerformanceObj(imageName, result, err, resizeTimeStart);
      imagePerfomanceRecordsGM.push(performanceObj);
      iterationCounterGM++;
      if(iterationCounterGM == count-1){
        recordPerformance(IMAGE_PERFORMANCE_FIELDS, imagePerfomanceRecordsGM, 'GM_node_Standard_Performace.csv');
      }
    });
  }
}


//Batch Process
//processThumbViaBatchIM()
//processStdViaBatchIM()
//processStdViaBatchGM();
//processThumbViaBatchGM();

/*
var sourceDir = getSourceImgBasePath();
readFilesFromDir(sourceDir, (imageNames)=>{
  var count = imageNames.length;
  
  imageNames.forEach(function(imageName, index){
    
    //resizeImageViaIM(imageName, count, false);

    //resizeImageViaGM(imageName, count, false);

    //resizeImageViaVIPS(imageName, count, true);

    //resizeImageViaGMNode(imageName, count, true);

  });

}, (err)=>{
    console.log('Unable to read source directory!');
});
*/

/**********************All GM Code ***************************/

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

var getStdPathForIM = function(imageName){
  var basePath = __dirname + '/public/Images/converted/IM/Standard/';
  return getCombinePathOfImg(basePath, imageName);
}

var getThumbPathForGM = function(imageName){
  var basePath = __dirname + '/public/Images/converted/GM/Thumbnail/';
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

var sourceDir = getSourceImgBasePath();
readFilesFromDir(sourceDir, (imageNames)=>{
  imageNameArr = imageNames;
  resizeImageToThumbViaGM(imageNameArr.shift(), gmThumbCallback);
});















