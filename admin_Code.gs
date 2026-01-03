const FORM_ID = PropertiesService.getScriptProperties().getProperty('FORM_ID') || '1aO2VjpPdH3Bn6sWbClTeOr08PoV5J7qeotloTFbvKRQ';
if (!FORM_ID) {
  throw new Error('BRAK FORM_ID w PropertiesService - ustaw w Ustawieniach projektu!');}
// KONFIG
const CONFIG = {
  SPREADSHEET_ID: FORM_ID,
  SHEET_ZAJECIA: 'zajecia',
  SHEET_ZAPISY: 'zapisy'
};

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('Panel admina – zapisy')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===== MODELE =====
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
    this.platne = platne === 'TAK';
  }
}

class AdminRecord {
  constructor(zapisId, uczen, klasa, rodzic, dataZapisu, activity, aktualneZapisy) {
    this.zapis_id = zapisId;
    this.uczen = uczen;
    this.klasa_ucznia = klasa;
    this.rodzic = rodzic;
    this.data_zapisu = dataZapisu;
    this.zajecie_id = activity.id;
    this.zajecie_nazwa = activity.nazwa;
    this.dzien = activity.dzien;
    this.godzina_od = activity.godzina_od;
    this.godzina_do = activity.godzina_do;
    this.klasa_zajec = activity.klasa;
    this.max_limit = activity.max_limit;
    this.min_limit = activity.min_limit;
    this.platne = activity.platne;
    this.aktualne_zapisy = aktualneZapisy;
    this.pozostale_miejsca = activity.max_limit - aktualneZapisy;
    this.czy_uruchomione = aktualneZapisy >= activity.min_limit;
  }
}

// ===== FUNKCJE POMOCNICZE =====

function formatTime(value) {
  if (!value) return '';
  if (value instanceof Date) {
    let h = value.getHours();
    let m = value.getMinutes();
    if (m < 10) m = '0' + m;
    return h + ':' + m;
  }
  return value.toString();
}

// główna funkcja – lista zapisów dla admina
function getAdminRecords() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheetZajecia = ss.getSheetByName(CONFIG.SHEET_ZAJECIA);
  const sheetZapisy = ss.getSheetByName(CONFIG.SHEET_ZAPISY);

  const zajeciaData = sheetZajecia.getDataRange().getValues();
  const zapisyData = sheetZapisy.getDataRange().getValues();

  const zajeciaHeaders = zajeciaData.shift(); // id, nazwa, dzien, od, do, klasa, max_limit, min_limit, platne
  const zapisyHeaders = zapisyData.shift();   // zapis_id, id_zajecia, nazwa, uczen, klasa, data_zapisu, rodzic

  // Mapy zajęć po id
  const activitiesById = {};
  zajeciaData.forEach(r => {
    if (!r[0]) return;
    const a = new Activity(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]);
    activitiesById[a.id] = a;
  });

  // Liczba zapisów na każde zajęcie
  const zapisyCountById = {};
  zapisyData.forEach(r => {
    const idZaj = r[1];
    if (!idZaj) return;
    zapisyCountById[idZaj] = (zapisyCountById[idZaj] || 0) + 1;
  });

  const records = zapisyData.map(r => {
    const zapisId     = r[0];
    const idZajecia   = r[1];
    const nazwaZaj    = r[2];
    const uczen       = r[3];
    const klasa       = r[4];
    const dataZapisu  = r[5];
    const rodzic      = r[6];

    const activity = activitiesById[idZajecia];

    if (!activity) {
      // brak powiązanego zajęcia – zwróć minimalny rekord
      return {
        zapis_id: zapisId,
        uczen: uczen,
        klasa_ucznia: klasa,
        rodzic: rodzic,
        data_zapisu: dataZapisu,
        zajecie_id: idZajecia,
        zajecie_nazwa: nazwaZaj || '(brak w arkuszu zajecia)',
        dzien: '',
        godzina_od: '',
        godzina_do: '',
        klasa_zajec: '',
        max_limit: '',
        min_limit: '',
        platne: false,
        aktualne_zapisy: 0,
        pozostale_miejsca: 0,
        czy_uruchomione: false
      };
    }

    const aktualneZapisy = zapisyCountById[idZajecia] || 0;

    // ZWRACAMY ZWYKŁY OBIEKT, NIE AdminRecord
    return {
      zapis_id: zapisId,
      uczen: uczen,
      klasa_ucznia: klasa,
      rodzic: rodzic,
      data_zapisu: dataZapisu,
      zajecie_id: activity.id,
      zajecie_nazwa: activity.nazwa,
      dzien: activity.dzien,
      godzina_od: activity.godzina_od,
      godzina_do: activity.godzina_do,
      klasa_zajec: activity.klasa,
      max_limit: activity.max_limit,
      min_limit: activity.min_limit,
      platne: activity.platne,
      aktualne_zapisy: aktualneZapisy,
      pozostale_miejsca: activity.max_limit - aktualneZapisy,
      czy_uruchomione: aktualneZapisy >= activity.min_limit
    };
  });

  // sortowanie: najpierw dzień, potem godzina_od
  const dniOrder = {
    'Poniedziałek': 1,
    'Wtorek': 2,
    'Środa': 3,
    'Czwartek': 4,
    'Piątek': 5
  };

  records.sort((a, b) => {
    if (dniOrder[a.dzien] !== dniOrder[b.dzien]) {
      return (dniOrder[a.dzien] || 99) - (dniOrder[b.dzien] || 99);
    }
    return (a.godzina_od || '').localeCompare(b.godzina_od || '');
  });

  Logger.log('rec: ' + JSON.stringify(records));
  //return records;
  return JSON.parse(JSON.stringify(records));
}
