/* ===== Automatic AF Script ===== */

/* === Main Function (runs on cell edit) === */
function main (e) {
 var ss = SpreadsheetApp.getActiveSpreadsheet().getId()
 var eventInformation = getEventInformation(e, ss)
 var course = eventInformation[0]
 var yourTime = eventInformation[1]
 var originalBlock = eventInformation[2]
 var rank = getRank(yourTime, course, originalBlock)
 cellEdit(rank, ss, e)
}

function getRank (yourTime, course, block) {
    let currentURL = getURL(course,block);
    let maxBlock = Math.floor(getTotalTimes(course))/100
    //boundary check to see if your time is in the page quickly before looping through everything
    while (!timeInBounds(currentURL, yourTime) && block >= 0) {
        block--;
        currentURL = getURL(course,block);
    } 
    //second bounds check before binary search to avoid excess operations
    let times = getTimeList(currentURL);
    if (block < 0) {
      return 1; //checks if you have WR
    } else if (block == maxBlock && yourTime > times[times.length-1]) {
      return getTotalTimes(course)+1; //checks if your time is last place
    } else {
    //binary search in the page for your time
        var upperBound = times.length-1;
        var lowerBound = 0;
        while (upperBound > lowerBound) {
          var midPoint = Math.floor((lowerBound+upperBound)/2);
          if (yourTime <= times[midPoint]) {
                upperBound = midPoint;
             } else lowerBound = midPoint+1;
             console.log("lb: "+lowerBound+" ub: "+upperBound+" lTime: "+times[lowerBound]+" uTime: "+times[upperBound]+" yourTime: "+yourTime);
        }
          //+1 is to correct for the array being 0-indexed
          console.log("return value is: " + (100*block+upperBound+1));
          return 100*block+upperBound+1;
    }
}

/* === inbounds check ===
checks if the time is on a given page
better than comparing against all times or creating a times array each time */
 function timeInBounds (url, yourTime) {
   var page = UrlFetchApp.fetch(url).getContentText();
    page = page.split("<table class='n' cellspacing='1'>").pop();
    const fullTable = page.split("<td>"); //splits on the thing that divides each row of times' cells in the html
    var maxTime = format(fullTable[fullTable.length-3].substring(0,8)) //it so happens that len-3 always returns the last time
    var minTime = format(fullTable[5].substring(0,8)) //so happens that the 6th element is always the first time
    return (yourTime <= maxTime && yourTime >= minTime)
 }

/* makes a list of times */
function getTimeList (url) {
    var page = UrlFetchApp.fetch(url).getContentText();
    // cuts html down to more or less just the table
    page = page.split("<table class='n' cellspacing='1'>").pop();
    // makes it an array instead of a single string
    const fullTable = page.split("<tr>"); 
    let times = [100]
    let timesIndex = 0
    for (let i = 0; i < fullTable.length; i++) {
      let row = fullTable[i];
      if (row.includes("<td>")) { //here we check for whether or not the row is a row with times and not a standard divider/random html
        rowComponents = row.split("<td>") //tech inefficient but w/e makes the code easier to understand
        let time = rowComponents[5].substring(0,8); //so happens that the time is always the 5th index
        times[timesIndex] = format(String(time));
        timesIndex++
      }
    }
    return times;
}

/* finds the total number of times for a given track on mk64.com */
function getTotalTimes(course) {
  var url = "https://www.mariokart64.com/mkds/coursen.php"
  var page = UrlFetchApp.fetch(url).getContentText();
  const fullTable = page.split("<td>"); //see above for this split logic
  rowContents = fullTable[course+1].split("statcode") //found this split string while inspecting the page - simplifies the final array a lot!
  var totalTimes = String(rowContents[2]).substring(2,rowContents[2].indexOf("<",2)) //more html magic that always gets the right part
  return totalTimes
}


/* gets a page of 100 times for the relevant track */
function getURL (course,block) {
    var url = "https://www.mariokart64.com/mkds/coursen.php?cid=" + course + "&start=" + block + "01";
    return url
}

function getEventInformation (e, sheet) {
    //have this return an array with [course,time,block]
    var row = e.range.rowStart;
    var col = e.range.columnStart;
    let information = [3]
    if (inBounds(row,col)) {
     var time = String(e.range.getCell(1, 1).getValue()) //its 1,1 and not r,c bc of some clown spreadsheet relativity
     time = format(time);
     var course = getCourse(row, col);

     //getting the block
     oldRank = Sheets.Spreadsheets.Values.get(sheet, "Imported Times!K" + (course+2)).values //+2 to due to offset in the import times page
     console.log("oldRank is: "+oldRank);
     var block = 0
     if(oldRank == ("")) {
       var totalTimes = getTotalTimes(course) //checks if you don't have a rank and sets the search starting from the last time on the page
       block = Math.floor(totalTimes/100)
     } else block = Math.floor(oldRank/100)
     information[0] = course
     information[1] = time
     information[2] = block
     return information
    }
 }

function inBounds (row,col) {
     return ((row < 19 && row > 2) && (col == 2 || col == 5 || col == 9 || col == 12))
}
 
function getCourse(row, col) {
    let course = 0
  row = row-3 //normalizes the row to make the first row of courses on the spreadsheet = 0
    if(col == 2) {
      course = 2*row;
  }
  if(col == 5) {
      course = 2*row+1
  }
  if(col == 9) {
      course = 2*row+32
  }
  if(col == 12) {
      course = 2*row+33
  }
  return course;
}

function format (timeString) {
    if(timeString.length > 8) {
   return 1000000 //should be bigger than any possible time (assuming all times are <10min)
  }
    while(timeString.length < 8) {
      timeString = "0"+timeString
  }
  var min = (timeString.substring(0,1))*60
  var sec = (timeString.substring(2,4))*1 //int cast lol
  var ms = timeString.substring(5)/1000
  let time = min+sec+ms
  return 1000*time
}

// this function was written by mikage and uses a lot of spreadsheet magic which i don't really understand
function cellEdit (place, sheet, e) { 
  let range = "Main!R" + e.range.rowStart + "C" + (e.range.columnStart + 2)
  let spreadsheetId = sheet;
  let valueRange = {
    "range": range,
    "majorDimension": "ROWS",
    "values": [[place]],
  };
  Sheets.Spreadsheets.Values.update(valueRange, spreadsheetId, range, {valueInputOption: "RAW"});
}
