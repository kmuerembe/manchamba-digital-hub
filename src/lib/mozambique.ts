export const mozambiqueProvinces: { province: string; cities: string[] }[] = [
  { province: "Cabo Delgado", cities: ["Pemba", "Montepuez", "Mocímboa da Praia", "Chiúre", "Mueda", "Balama", "Ancuabe", "Palma", "Macomia", "Namuno", "Metuge", "Ibo"] },
  { province: "Niassa", cities: ["Lichinga", "Cuamba", "Marrupa", "Mandimba", "Lago (Metangula)", "Majune", "Maúa", "Mecanhelas", "Sanga", "Ngauma"] },
  { province: "Nampula", cities: ["Nampula", "Nacala", "Angoche", "Ilha de Moçambique", "Monapo", "Ribáuè", "Malema", "Meconta", "Mogincual", "Murrupula", "Moma", "Memba"] },
  { province: "Zambézia", cities: ["Quelimane", "Mocuba", "Gurué", "Milange", "Alto Molócuè", "Nicoadala", "Pebane", "Maganja da Costa", "Namacurra", "Morrumbala", "Lugela", "Ile"] },
  { province: "Tete", cities: ["Tete", "Moatize", "Angónia (Ulóngue)", "Cahora Bassa (Songo)", "Mutarara", "Changara", "Zumbo", "Macanga", "Chiúta", "Marávia"] },
  { province: "Manica", cities: ["Chimoio", "Manica", "Gondola", "Catandica (Báruè)", "Sussundenga", "Machaze", "Mossurize (Espungabera)", "Guro", "Tambara", "Macossa"] },
  { province: "Sofala", cities: ["Beira", "Dondo", "Nhamatanda", "Gorongosa", "Búzi", "Marromeu", "Caia", "Chibabava", "Machanga", "Muanza"] },
  { province: "Inhambane", cities: ["Inhambane", "Maxixe", "Vilanculos", "Massinga", "Morrumbene", "Homoíne", "Inharrime", "Zavala (Quissico)", "Panda", "Funhalouro", "Govuro (Nova Mambone)"] },
  { province: "Gaza", cities: ["Xai-Xai", "Chókwè", "Chibuto", "Manjacaze", "Bilene (Macia)", "Guijá", "Massingir", "Mabalane", "Chicualacuala", "Massangena"] },
  { province: "Maputo Província", cities: ["Matola", "Boane", "Namaacha", "Marracuene", "Manhiça", "Moamba", "Magude", "Matutuíne (Bela Vista)"] },
  { province: "Maputo Cidade", cities: ["KaMpfumu (Baixa)", "Nlhamankulu", "KaMaxaquene", "KaMavota", "KaMubukwana", "KaTembe", "KaNyaka (Inhaca)"] },
];

export const provinceNames = mozambiqueProvinces.map((item) => item.province);

export function citiesOf(province: string): string[] {
  return mozambiqueProvinces.find((item) => item.province === province)?.cities ?? [];
}
