/**
 * Aramega Checklist — Google Apps Script backend.
 * Serves the app (index.html) and stores all data in a Google Sheet
 * named "Aramega Checklist Data" that is auto-created in your Drive on
 * first use. Sheet "Tasks" holds the checklist; sheet "Pins" holds
 * the 4-digit PINs.
 */

var SS_PROP = "SPREADSHEET_ID";
var TASK_HEADERS = ["id", "title", "source", "assignee", "date", "done", "doneAt", "order"];

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Aramega Checklist")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SS_PROP);
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create("Aramega Checklist Data");
    props.setProperty(SS_PROP, ss.getId());
  }
  if (!ss.getSheetByName("Tasks")) {
    var tasks = ss.insertSheet("Tasks");
    tasks.getRange(1, 1, 1, TASK_HEADERS.length).setValues([TASK_HEADERS]).setFontWeight("bold");
    tasks.getRange("A:E").setNumberFormat("@"); // keep ids/dates as plain text
    tasks.setFrozenRows(1);
  }
  if (!ss.getSheetByName("Pins")) {
    var pins = ss.insertSheet("Pins");
    pins.getRange("A:B").setNumberFormat("@"); // keep leading zeros in PINs
    pins.getRange(1, 1, 5, 2).setValues([
      ["role", "pin"],
      ["boss", "9999"],
      ["admin", "1111"],
      ["sales", "2222"],
      ["operator", "3333"]
    ]);
    pins.getRange(1, 1, 1, 2).setFontWeight("bold");
    pins.setFrozenRows(1);
  }
  if (!ss.getSheetByName("Routines")) {
    var routines = ss.insertSheet("Routines");
    routines.getRange(1, 1, 1, 6).setValues([["id", "title", "assignee", "order", "doneDate", "doneAt"]]).setFontWeight("bold");
    routines.getRange("A:A").setNumberFormat("@");
    routines.getRange("E:E").setNumberFormat("@");
    routines.setFrozenRows(1);
  }
  if (!ss.getSheetByName("RoutineLog")) {
    var log = ss.insertSheet("RoutineLog");
    log.getRange(1, 1, 1, 5).setValues([["date", "assignee", "routineId", "title", "doneAt"]]).setFontWeight("bold");
    log.getRange("A:A").setNumberFormat("@");
    log.getRange("C:C").setNumberFormat("@");
    log.setFrozenRows(1);
  }
  var stub = ss.getSheetByName("Sheet1");
  if (stub && ss.getSheets().length > 2) ss.deleteSheet(stub);
  return ss;
}

function normDate_(v) {
  if (v instanceof Date) {
    return v.getFullYear() + "-" + pad2_(v.getMonth() + 1) + "-" + pad2_(v.getDate());
  }
  return String(v);
}
function pad2_(n) { return (n < 10 ? "0" : "") + n; }
function padPin_(v) {
  var s = String(v).trim();
  return /^\d{1,4}$/.test(s) ? ("0000" + s).slice(-4) : s;
}

function getData() {
  var ss = getSpreadsheet_();
  var vals = ss.getSheetByName("Tasks").getDataRange().getValues();
  var tasks = [];
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i];
    if (!r[0]) continue;
    tasks.push({
      id: String(r[0]),
      title: String(r[1]),
      source: String(r[2] || ""),
      assignee: String(r[3]),
      date: normDate_(r[4]),
      done: r[5] === true || String(r[5]).toUpperCase() === "TRUE",
      doneAt: r[6] ? Number(r[6]) : null,
      order: Number(r[7]) || 0
    });
  }
  var rVals = ss.getSheetByName("Routines").getDataRange().getValues();
  var routines = [];
  for (var k = 1; k < rVals.length; k++) {
    var rr = rVals[k];
    if (!rr[0]) continue;
    routines.push({
      id: String(rr[0]),
      title: String(rr[1]),
      assignee: String(rr[2]),
      order: Number(rr[3]) || 0,
      doneDate: rr[4] ? normDate_(rr[4]) : "",
      doneAt: rr[5] ? Number(rr[5]) : null
    });
  }
  var lVals = ss.getSheetByName("RoutineLog").getDataRange().getValues();
  var routineLog = [];
  for (var m = 1; m < lVals.length; m++) {
    var lr = lVals[m];
    if (!lr[0]) continue;
    routineLog.push({
      date: normDate_(lr[0]),
      assignee: String(lr[1]),
      routineId: String(lr[2]),
      title: String(lr[3] || "")
    });
  }
  var pVals = ss.getSheetByName("Pins").getDataRange().getValues();
  var pins = {};
  for (var j = 1; j < pVals.length; j++) {
    if (pVals[j][0]) pins[String(pVals[j][0])] = padPin_(pVals[j][1]);
  }
  return { pins: pins, tasks: tasks, routines: routines, routineLog: routineLog };
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function findTaskRow_(sheet, id) {
  var ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function addTask(task) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Tasks");
    sheet.appendRow([
      String(task.id),
      String(task.title),
      String(task.source || ""),
      String(task.assignee),
      String(task.date),
      false,
      "",
      Number(task.order) || 0
    ]);
    return true;
  });
}

function setDone(id, done, doneAt) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Tasks");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.getRange(row, 6, 1, 2).setValues([[done === true, done && doneAt ? Number(doneAt) : ""]]);
    return true;
  });
}

function setTitle(id, title) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Tasks");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.getRange(row, 2).setValue(String(title));
    return true;
  });
}

function setSource(id, source) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Tasks");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.getRange(row, 3).setValue(String(source || ""));
    return true;
  });
}

function setAssignee(id, assignee) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Tasks");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.getRange(row, 4).setValue(String(assignee));
    return true;
  });
}

function deleteTask(id) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Tasks");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.deleteRow(row);
    return true;
  });
}

/** Receives the task ids of one day-group in their new order. */
function reorderTasks(ids) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Tasks");
    for (var i = 0; i < ids.length; i++) {
      var row = findTaskRow_(sheet, ids[i]);
      if (row > 0) sheet.getRange(row, 8).setValue(i + 1);
    }
    return true;
  });
}

/* ---------- routines (reset daily via doneDate) ---------- */

function addRoutine(routine) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Routines");
    sheet.appendRow([
      String(routine.id),
      String(routine.title),
      String(routine.assignee),
      Number(routine.order) || 0,
      "",
      ""
    ]);
    return true;
  });
}

/**
 * Updates a routine's tick for the day AND keeps the permanent KPI log:
 * ticking appends a RoutineLog row for that date; unticking removes it.
 * effDate is the day being changed (sent by the client).
 */
function setRoutineDone(id, doneDate, doneAt, effDate) {
  return withLock_(function () {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName("Routines");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.getRange(row, 5, 1, 2).setValues([[doneDate ? String(doneDate) : "", doneAt ? Number(doneAt) : ""]]);

    var day = String(doneDate || effDate || "");
    if (day) {
      var log = ss.getSheetByName("RoutineLog");
      var vals = log.getDataRange().getValues();
      for (var i = vals.length - 1; i >= 1; i--) {
        if (String(vals[i][2]) === String(id) && normDate_(vals[i][0]) === day) log.deleteRow(i + 1);
      }
      if (doneDate) {
        var assignee = String(sheet.getRange(row, 3).getValue());
        var title = String(sheet.getRange(row, 2).getValue());
        log.appendRow([day, assignee, String(id), title, doneAt ? Number(doneAt) : ""]);
      }
    }
    return true;
  });
}

function setRoutineTitle(id, title) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Routines");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.getRange(row, 2).setValue(String(title));
    return true;
  });
}

function setRoutineAssignee(id, assignee) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Routines");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.getRange(row, 3).setValue(String(assignee));
    return true;
  });
}

function deleteRoutine(id) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Routines");
    var row = findTaskRow_(sheet, id);
    if (row < 0) return false;
    sheet.deleteRow(row);
    return true;
  });
}

function reorderRoutines(ids) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Routines");
    for (var i = 0; i < ids.length; i++) {
      var row = findTaskRow_(sheet, ids[i]);
      if (row > 0) sheet.getRange(row, 4).setValue(i + 1);
    }
    return true;
  });
}

function savePins(pins) {
  return withLock_(function () {
    var sheet = getSpreadsheet_().getSheetByName("Pins");
    var roles = ["boss", "admin", "sales", "operator"];
    var rows = [["role", "pin"]];
    for (var i = 0; i < roles.length; i++) {
      rows.push([roles[i], padPin_(pins[roles[i]] || "0000")]);
    }
    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    return true;
  });
}
