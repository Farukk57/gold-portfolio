import { useState, useEffect } from 'react';

const T = {
  en: {
    title: 'Gold Portfolio', subtitle: 'Precious Metals',
    refresh: 'Refresh', add: 'Add', loading: 'Loading portfolio…',
    portfolioValue: 'Portfolio Value', totalInvested: 'Total Invested', gainLoss: 'Gain / Loss',
    priceHistory: 'Price History', portfolioHistory: 'Portfolio Value',
    costBasis: 'Cost Basis', allocation: 'Allocation',
    holdings: 'Holdings', noHoldings: 'No holdings yet. Tap Add to get started.',
    metal: 'Metal', name: 'Name', weight: 'Weight', carat: 'Carat',
    spotOz: 'Spot /oz', value: 'Value', paid: 'Paid', pl: 'P&L',
    addHolding: 'Add Holding', editHolding: 'Edit Holding',
    quickAdd: 'Quick Add from Template',
    namePlaceholder: 'e.g. Reşat Altını',
    weightGrams: 'Weight (grams)', purchasePrice: 'Purchase Price',
    purchaseDate: 'Purchase Date', optional: 'Optional', notes: 'Notes',
    saveTemplate: 'Save as Template', cancel: 'Cancel', update: 'Update',
    quantity: 'Quantity', buildingHistory: 'Chart builds as prices are recorded hourly.',
    myTemplates: 'My Templates', noCustomTemplates: 'No saved templates yet. Fill the form and click "Save as Template".',
    deleteConfirm: 'Delete this holding?', vs2yr: 'vs 2yr ago',
    lightMode: 'Light mode', darkMode: 'Dark mode',
    errName: 'Name is required',
    errWeight: 'Enter a valid weight greater than 0',
    errPrice: 'Enter a valid positive price or leave empty',
    errQty: 'Quantity must be between 1 and 99',
    delete: 'Delete', deleteTitle: 'Delete holding?', deleteWarning: 'This cannot be undone.',
    addedToast: 'Added {n}× {name}',
    updatedToast: 'Updated {name}',
    deletedToast: 'Deleted',
    templateSaved: 'Template saved',
    perOz: '/oz', gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium',
    turkish: '🇹🇷 Turkish', german: '🇩🇪 German', international: '🌍 International',
    purchased: 'Purchased', rangeAll: 'All', noData: 'No data for this range.',
  },
  tr: {
    title: 'Altın Portföy', subtitle: 'Değerli Metaller',
    refresh: 'Yenile', add: 'Ekle', loading: 'Portföy yükleniyor…',
    portfolioValue: 'Portföy Değeri', totalInvested: 'Toplam Yatırım', gainLoss: 'Kâr / Zarar',
    priceHistory: 'Fiyat Geçmişi', portfolioHistory: 'Portföy Değeri',
    costBasis: 'Maliyet', allocation: 'Dağılım',
    holdings: 'Varlıklar', noHoldings: 'Henüz varlık yok. Ekle\'ye basın.',
    metal: 'Metal', name: 'İsim', weight: 'Ağırlık', carat: 'Ayar',
    spotOz: 'Spot /ons', value: 'Değer', paid: 'Ödenen', pl: 'K/Z',
    addHolding: 'Varlık Ekle', editHolding: 'Varlığı Düzenle',
    quickAdd: 'Şablondan Hızlı Ekle',
    namePlaceholder: 'örn. Reşat Altını',
    weightGrams: 'Ağırlık (gram)', purchasePrice: 'Alış Fiyatı',
    purchaseDate: 'Alış Tarihi', optional: 'İsteğe bağlı', notes: 'Notlar',
    saveTemplate: 'Şablon Kaydet', cancel: 'İptal', update: 'Güncelle',
    quantity: 'Adet', buildingHistory: 'Grafik fiyatlar kaydedildikçe oluşur.',
    myTemplates: 'Şablonlarım', noCustomTemplates: 'Henüz şablon yok. Formu doldurup "Şablon Kaydet"e basın.',
    deleteConfirm: 'Bu varlık silinsin mi?', vs2yr: '2 yıl öncesine göre',
    lightMode: 'Açık tema', darkMode: 'Koyu tema',
    errName: 'İsim zorunludur',
    errWeight: '0\'dan büyük geçerli bir ağırlık girin',
    errPrice: 'Geçerli bir fiyat girin veya boş bırakın',
    errQty: 'Adet 1 ile 99 arasında olmalıdır',
    delete: 'Sil', deleteTitle: 'Varlığı sil?', deleteWarning: 'Bu işlem geri alınamaz.',
    addedToast: '{n}× {name} eklendi',
    updatedToast: '{name} güncellendi',
    deletedToast: 'Silindi',
    templateSaved: 'Şablon kaydedildi',
    perOz: '/ons', gold: 'Altın', silver: 'Gümüş', platinum: 'Platin', palladium: 'Paladyum',
    turkish: '🇹🇷 Türk', german: '🇩🇪 Alman', international: '🌍 Uluslararası',
    purchased: 'Alış Tarihi', rangeAll: 'Tümü', noData: 'Bu aralıkta veri yok.',
  },
  de: {
    title: 'Gold Portfolio', subtitle: 'Edelmetalle',
    refresh: 'Aktualisieren', add: 'Hinzufügen', loading: 'Portfolio wird geladen…',
    portfolioValue: 'Portfoliowert', totalInvested: 'Investiert', gainLoss: 'Gewinn / Verlust',
    priceHistory: 'Preisverlauf', portfolioHistory: 'Portfoliowert',
    costBasis: 'Einstandspreis', allocation: 'Aufteilung',
    holdings: 'Bestände', noHoldings: 'Keine Bestände. Auf Hinzufügen tippen.',
    metal: 'Metall', name: 'Name', weight: 'Gewicht', carat: 'Karat',
    spotOz: 'Spot /oz', value: 'Wert', paid: 'Gezahlt', pl: 'G/V',
    addHolding: 'Bestand hinzufügen', editHolding: 'Bestand bearbeiten',
    quickAdd: 'Schnell aus Vorlage',
    namePlaceholder: 'z.B. Krügerrand 1 oz',
    weightGrams: 'Gewicht (Gramm)', purchasePrice: 'Kaufpreis',
    purchaseDate: 'Kaufdatum', optional: 'Optional', notes: 'Notizen',
    saveTemplate: 'Als Vorlage speichern', cancel: 'Abbrechen', update: 'Aktualisieren',
    quantity: 'Anzahl', buildingHistory: 'Diagramm baut sich stündlich auf.',
    myTemplates: 'Meine Vorlagen', noCustomTemplates: 'Noch keine Vorlagen. Formular ausfüllen und „Vorlage speichern" klicken.',
    deleteConfirm: 'Diesen Bestand löschen?', vs2yr: 'vs. vor 2 Jahren',
    lightMode: 'Helles Design', darkMode: 'Dunkles Design',
    errName: 'Name ist erforderlich',
    errWeight: 'Gültiges Gewicht größer als 0 eingeben',
    errPrice: 'Gültigen Preis eingeben oder leer lassen',
    errQty: 'Anzahl muss zwischen 1 und 99 liegen',
    delete: 'Löschen', deleteTitle: 'Bestand löschen?', deleteWarning: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    addedToast: '{n}× {name} hinzugefügt',
    updatedToast: '{name} aktualisiert',
    deletedToast: 'Gelöscht',
    templateSaved: 'Vorlage gespeichert',
    perOz: '/oz', gold: 'Gold', silver: 'Silber', platinum: 'Platin', palladium: 'Palladium',
    turkish: '🇹🇷 Türkisch', german: '🇩🇪 Deutsch', international: '🌍 International',
    purchased: 'Kaufdatum', rangeAll: 'Alle', noData: 'Keine Daten für diesen Zeitraum.',
  },
};

export const LANGS = { en: '🇬🇧 EN', tr: '🇹🇷 TR', de: '🇩🇪 DE' };

let _listeners = new Set();
let _lang = (() => { try { return localStorage.getItem('lang') || 'en'; } catch { return 'en'; } })();

export function setLang(l) {
  _lang = l;
  try { localStorage.setItem('lang', l); } catch {}
  _listeners.forEach(fn => fn(l));
}

export function useLang() {
  const [lang, set] = useState(_lang);
  useEffect(() => {
    _listeners.add(set);
    return () => _listeners.delete(set);
  }, []);
  return lang;
}

export function useT() {
  const lang = useLang();
  return (key, vars) => {
    let s = T[lang]?.[key] ?? T.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };
}
