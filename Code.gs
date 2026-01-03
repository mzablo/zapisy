const FORM_ID = PropertiesService.getScriptProperties().getProperty('FORM_ID') || '1aO2VjpPdH3Bn6sWbClTeOr08PoV5J7qeotloTFbvKRQ';

function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('Aplikacja do zapisów')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getFormHtml() {
  return HtmlService.createHtmlOutputFromFile('form').getContent();
}

function getZajeciaList() {
  const ss = SpreadsheetApp.openById(FORM_ID);
  const sheet = ss.getSheetByName('zajecia');
  const zajeciaData = sheet.getDataRange().getValues();
  zajeciaData.shift();
  const zapisyData = ss.getSheetByName('zapisy').getDataRange().getValues();

  const dniOrder = {
    'Poniedziałek': 1,
    'Wtorek': 2,
    'Środa': 3,
    'Czwartek': 4,
    'Piątek': 5
  };

  const activities = zajeciaData .filter(r => r[0])
    .map(r => new Activity(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]))
    .map(a => {
      const aktualneZapisy = zapisyData.filter(row => row[1] == a.id).length;
      Logger.log(a.id + ' | zapisanych: ' + aktualneZapisy +' | limit: ' + (jakiLimitDlaZajecia(a.id, zajeciaData)+" "+jakieMinimumDlaZajecia(a.id, zajeciaData)));
      return new ActivityView(a.id, 
        a.nazwa, 
        a.dzien, 
        a.godzina_od, 
        a.godzina_do, 
        a.klasa, 
        a.max_limit,
        a.min_limit,
        (jakiLimitDlaZajecia(a.id, zajeciaData) - aktualneZapisy),
        (aktualneZapisy >= jakieMinimumDlaZajecia(a.id, zajeciaData)),
        a.platne,
        aktualneZapisy
      );
    }
    )
    .sort((a, b) => { if (dniOrder[a.dzien] !== dniOrder[b.dzien]) { return dniOrder[a.dzien] - dniOrder[b.dzien]; } });

  activities.forEach(a => {
      Logger.log(a.nazwa + ' | ' + a.dzien + ' | ' + a.godzina_od + '-' + a.godzina_do  + ' | ' + a.ileDostepnych  + ' | ' + a.czyUruchomione +' | ' + a.platne);
    });
  return activities;
}

function jakiLimitDlaZajecia(id_zajecia, zajeciaData){
  const zajecieRow = zajeciaData.find(row => row[0] == id_zajecia);
  return zajecieRow[6];//max_limit
 }

function jakieMinimumDlaZajecia(id_zajecia, zajeciaData){
  const zajecieRow = zajeciaData.find(row => row[0] == id_zajecia);
  return zajecieRow[7];//min_limit
 }

function zapiszDziecko(zapisywanyUczen) {
  const ss = SpreadsheetApp.openById(FORM_ID);
  const sheetZapisy=ss.getSheetByName('zapisy');
  const zajeciaData = ss.getSheetByName('zajecia').getDataRange().getValues();
  const zapisyData = sheetZapisy.getDataRange().getValues();
  const aktualneZapisy = zapisyData.filter(row => row[1] == zapisywanyUczen.id_zajecia).length;
  const maxLimit = jakiLimitDlaZajecia(zapisywanyUczen.id_zajecia, zajeciaData); 
    if (aktualneZapisy >= maxLimit) {
      return `❌ Limit miejsc przekroczony! Dostępne: 0/${maxLimit}`;
    }
  const noweZajecie = getZajecieById(zapisywanyUczen.id_zajecia, zajeciaData);
  console.log('Zapisywany uczen: ', zapisywanyUczen);
  console.log('Zajecie na jakie zapisujemy: ', noweZajecie);
  if (!noweZajecie) {
    return 'Błąd: nie znaleziono zajęcia.';
  }
  // Sprawdzenie konfliktów
  const konflikt = zapisyData.some(istniejacyZapis => {
    const istniejacyUczen = istniejacyZapis[3]; // kolumna "uczen"
    const istniejacaKlasa = istniejacyZapis[4]; 
    const idZajIstniejace = istniejacyZapis[1];    // id_zajecia już zapisane
    if (String(istniejacaKlasa) !== String(zapisywanyUczen.klasa)) {
      console.log('na to zajecie nie ma konfliktu - rozne klasy');
      return false;
    }
    if (idZajIstniejace == zapisywanyUczen.id_zajecia) {
      console.log('Dziecko jest juz zapisane na zajecie o id: '+ idZajIstniejace);
      return true;
    }
    const stareZajecie = getZajecieById(idZajIstniejace, zajeciaData);
    if (!stareZajecie) return false;
    if (stareZajecie.dzien !== noweZajecie.dzien) {
        return false;
    }
    return godzinyNachodza(
      stareZajecie.godzina_od,
      stareZajecie.godzina_do,
      noweZajecie.godzina_od,
      noweZajecie.godzina_do
    );
  });

  if (konflikt) {
     return "Błąd: dziecko jest już zapisane na to zajęcie lub ma kolizję czasową.";
  }

  // Dodanie wiersza
  sheetZapisy.appendRow([
    zapisyData.length + 1,
    zapisywanyUczen.id_zajecia,
    zapisywanyUczen.nazwa,
    zapisywanyUczen.uczen.trim(),
    zapisywanyUczen.klasa,
    new Date(), // automatyczna data zapisu
    zapisywanyUczen.rodzic.trim()
  ]);

  return "Zapisano dziecko!";
}

function getDzienGodzina(nazwaZajecia, dataZapisu) {
  return nazwaZajecia + '|' + dataZapisu; 
}

function getZajecieById(id_zajecia, zajeciaData) {
  // zakładamy, że zajeciaData to już tablica BEZ nagłówka
  const row = zajeciaData.find(r => r[0] == id_zajecia);
  if (!row) return null;
  return {
    id: row[0],
    nazwa: row[1],
    dzien: row[2],
    godzina_od: row[3],
    godzina_do: row[4],
    klasa: row[5]//moze sie przyda jesli spr czy podana klasa ucznia pasuje do zajecia
  };
}

function godzinyNachodza(godzOd1, godzDo1, godzOd2, godzDo2) {
  // zakładamy format "HH:MM" lub Date z arkusza
  const t1_start = toMinutes(godzOd1);
  const t1_end   = toMinutes(godzDo1);
  const t2_start = toMinutes(godzOd2);
  const t2_end   = toMinutes(godzDo2);

  // nachodzenie: początek jednego < koniec drugiego i odwrotnie
  return t1_start < t2_end && t2_start < t1_end;
}

function toMinutes(v) {
  if (v instanceof Date) {
    return v.getHours() * 60 + v.getMinutes();
  }
  const [h, m] = v.toString().split(':');
  return parseInt(h, 10) * 60 + parseInt(m || '0', 10);
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

class ActivityView {
  constructor(id, nazwa, dzien, od, do_, klasa, max, min, ileDostepnych, czyUruchomione, platne, ileZapisanych) {
    this.id = id;
    this.nazwa = nazwa;
    this.dzien = dzien;
    this.godzina_od = formatTime(od);
    this.godzina_do = formatTime(do_);
    this.klasa = klasa;
    this.max_limit = max;
    this.min_limit = min;
    this.ileDostepnych = ileDostepnych;
    this.czyUruchomione = czyUruchomione;
    this.platne = platne;
    this.ileZapisanych = ileZapisanych;
  }
}
