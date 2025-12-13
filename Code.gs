function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
     .setTitle('Lista zajęć dodatkowych');
}

function getZajeciaList() {
  const ss = SpreadsheetApp.openById("1aO2VjpPdH3Bn6sWbClTeOr08PoV5J7qeotloTFbvKRQ");
  const sheet = ss.getSheetByName('zajecia');
  const data = sheet.getDataRange().getValues();

  const headers = data.shift();

  const dniOrder = {
    'Poniedziałek': 1,
    'Wtorek': 2,
    'Środa': 3,
    'Czwartek': 4,
    'Piątek': 5
  };

  const activities = data .filter(r => r[0]) .map(r => new Activity(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8])) .sort((a, b) => { if (dniOrder[a.dzien] !== dniOrder[b.dzien]) { return dniOrder[a.dzien] - dniOrder[b.dzien]; } });

  activities.forEach(a => {
      Logger.log(a.nazwa + ' | ' + a.dzien + ' | ' + a.godzina_od + '-' + a.godzina_do);
    });
  return activities;
}

function zapiszDziecko(data) {
  const ss = SpreadsheetApp.openById("1aO2VjpPdH3Bn6sWbClTeOr08PoV5J7qeotloTFbvKRQ");
  const sheetZajecia = ss.getSheetByName('zajecia');
  const sheetZapisy = ss.getSheetByName('zapisy');
  
  const zapisData = sheetZapisy.getDataRange().getValues();
  const headers = zapisData.shift();

  // Sprawdzenie konfliktów
  const konflikt = zapisData.some(r => {
    const uczen = r[3]; // kolumna "uczen"
    const dzien_godzina = getDzienGodzina(r[2], r[5]); // nazwa zajecia + data_zapisu
    const now_dzien_godzina = getDzienGodzina(data.nazwa, data.data_zapisu);
    
    return (uczen === data.uczen) &&
           (r[1] === data.id_zajecia || dzien_godzina === now_dzien_godzina);
  });

  if (konflikt) {
    return "Błąd: dziecko jest już zapisane na to zajęcie lub ma kolizję czasową.";
  }

  // Dodanie wiersza
  sheetZapisy.appendRow([
    zapisData.length + 1,
    data.id_zajecia,
    data.nazwa,
    data.uczen,
    data.klasa,
    new Date(), // automatyczna data zapisu
    data.rodzic
  ]);

  return "Zapisano dziecko!";
}

// Funkcja pomocnicza do porównania dnia i godziny
function getDzienGodzina(nazwaZajecia, dataZapisu) {
  return nazwaZajecia + '|' + dataZapisu; // prosty sposób
}


function formatTime(value) {
  if (!value) return "";
  if (value instanceof Date) {
    let h = value.getHours();
    let m = value.getMinutes();
    if (m < 10) m = "0" + m;
    return h + ":" + m;
  }
  return value.toString(); 
}

// Funkcja pomocnicza do porównania dnia i godziny
function getDzienGodzina(nazwaZajecia, dataZapisu) {
  return nazwaZajecia + '|' + dataZapisu; // prosty sposób
}


class Activity {
  constructor(id, nazwa, dzien, od, do_, klasa, max, min, platne) {
    this.id = id;
    this.nazwa = nazwa;
    this.dzien = dzien;
    this.godzina_od = formatTime(od);
    this.godzina_do = formatTime(do_);
    this.klasa = klasa;
    this.max_limit = max;
    this.min_limit = min;
    this.platne = platne === "TAK";
  }
}
