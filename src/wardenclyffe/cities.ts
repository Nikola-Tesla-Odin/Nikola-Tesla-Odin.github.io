export type City = { id: string; name: string; country: string; lat: number; lon: number };

// name|country|lat|lon — big cities plus the places Tesla's life ran through.
const RAW = `
Smiljan|Croatia|44.56|15.32
Graz|Austria|47.07|15.44
Prague|Czechia|50.08|14.44
Budapest|Hungary|47.50|19.04
Paris|France|48.86|2.35
New York|United States|40.71|-74.01
Colorado Springs|United States|38.83|-104.82
Niagara Falls|United States|43.09|-79.06
Belgrade|Serbia|44.79|20.45
Zagreb|Croatia|45.81|15.98
Novi Sad|Serbia|45.27|19.83
Sarajevo|Bosnia and Herzegovina|43.86|18.41
Ljubljana|Slovenia|46.06|14.51
Vienna|Austria|48.21|16.37
Berlin|Germany|52.52|13.40
Munich|Germany|48.14|11.58
Hamburg|Germany|53.55|9.99
Frankfurt|Germany|50.11|8.68
Zurich|Switzerland|47.37|8.54
Geneva|Switzerland|46.20|6.14
Zug|Switzerland|47.17|8.52
London|United Kingdom|51.51|-0.13
Manchester|United Kingdom|53.48|-2.24
Edinburgh|United Kingdom|55.95|-3.19
Dublin|Ireland|53.35|-6.26
Amsterdam|Netherlands|52.37|4.90
Brussels|Belgium|50.85|4.35
Lisbon|Portugal|38.72|-9.14
Porto|Portugal|41.15|-8.61
Madrid|Spain|40.42|-3.70
Barcelona|Spain|41.39|2.17
Rome|Italy|41.90|12.50
Milan|Italy|45.46|9.19
Athens|Greece|37.98|23.73
Istanbul|Türkiye|41.01|28.98
Ankara|Türkiye|39.93|32.86
Warsaw|Poland|52.23|21.01
Krakow|Poland|50.06|19.94
Bucharest|Romania|44.43|26.10
Sofia|Bulgaria|42.70|23.32
Kyiv|Ukraine|50.45|30.52
Moscow|Russia|55.76|37.62
Saint Petersburg|Russia|59.93|30.34
Stockholm|Sweden|59.33|18.07
Oslo|Norway|59.91|10.75
Copenhagen|Denmark|55.68|12.57
Helsinki|Finland|60.17|24.94
Tallinn|Estonia|59.44|24.75
Riga|Latvia|56.95|24.11
Vilnius|Lithuania|54.69|25.28
Reykjavik|Iceland|64.15|-21.94
Tbilisi|Georgia|41.72|44.79
Yerevan|Armenia|40.18|44.51
Baku|Azerbaijan|40.41|49.87
Tel Aviv|Israel|32.09|34.78
Dubai|United Arab Emirates|25.20|55.27
Abu Dhabi|United Arab Emirates|24.45|54.38
Riyadh|Saudi Arabia|24.71|46.68
Doha|Qatar|25.29|51.53
Tehran|Iran|35.69|51.39
Cairo|Egypt|30.04|31.24
Casablanca|Morocco|33.57|-7.59
Tunis|Tunisia|36.81|10.18
Lagos|Nigeria|6.52|3.38
Abuja|Nigeria|9.08|7.40
Accra|Ghana|5.60|-0.19
Dakar|Senegal|14.72|-17.47
Addis Ababa|Ethiopia|9.03|38.74
Nairobi|Kenya|-1.29|36.82
Kampala|Uganda|0.35|32.58
Kigali|Rwanda|-1.94|30.06
Dar es Salaam|Tanzania|-6.79|39.21
Johannesburg|South Africa|-26.20|28.05
Cape Town|South Africa|-33.92|18.42
Luanda|Angola|-8.84|13.23
Kinshasa|DR Congo|-4.44|15.27
Karachi|Pakistan|24.86|67.01
Lahore|Pakistan|31.55|74.34
Islamabad|Pakistan|33.68|73.05
Kabul|Afghanistan|34.56|69.21
Tashkent|Uzbekistan|41.30|69.24
Almaty|Kazakhstan|43.24|76.89
Mumbai|India|19.08|72.88
Delhi|India|28.61|77.21
Bengaluru|India|12.97|77.59
Hyderabad|India|17.39|78.49
Chennai|India|13.08|80.27
Kolkata|India|22.57|88.36
Pune|India|18.52|73.86
Ahmedabad|India|23.02|72.57
Jaipur|India|26.91|75.79
Lucknow|India|26.85|80.95
Kanpur|India|26.45|80.33
Patna|India|25.59|85.14
Indore|India|22.72|75.86
Bhopal|India|23.26|77.41
Nagpur|India|21.15|79.09
Surat|India|21.17|72.83
Chandigarh|India|30.73|76.78
Gurugram|India|28.46|77.03
Noida|India|28.54|77.39
Kochi|India|9.93|76.27
Thiruvananthapuram|India|8.52|76.94
Coimbatore|India|11.02|76.96
Visakhapatnam|India|17.69|83.22
Bhubaneswar|India|20.30|85.82
Guwahati|India|26.14|91.74
Varanasi|India|25.32|82.97
Goa|India|15.50|73.83
Dehradun|India|30.32|78.03
Raipur|India|21.25|81.63
Ranchi|India|23.34|85.31
Kathmandu|Nepal|27.72|85.32
Dhaka|Bangladesh|23.81|90.41
Colombo|Sri Lanka|6.93|79.86
Yangon|Myanmar|16.84|96.17
Bangkok|Thailand|13.76|100.50
Chiang Mai|Thailand|18.79|98.98
Hanoi|Vietnam|21.03|105.85
Ho Chi Minh City|Vietnam|10.82|106.63
Phnom Penh|Cambodia|11.56|104.92
Kuala Lumpur|Malaysia|3.14|101.69
Singapore|Singapore|1.35|103.82
Jakarta|Indonesia|-6.21|106.85
Bali|Indonesia|-8.65|115.22
Manila|Philippines|14.60|120.98
Hong Kong|China|22.32|114.17
Shenzhen|China|22.54|114.06
Guangzhou|China|23.13|113.26
Shanghai|China|31.23|121.47
Beijing|China|39.90|116.41
Chengdu|China|30.57|104.07
Hangzhou|China|30.27|120.16
Taipei|Taiwan|25.03|121.57
Seoul|South Korea|37.57|126.98
Busan|South Korea|35.18|129.08
Tokyo|Japan|35.68|139.69
Osaka|Japan|34.69|135.50
Ulaanbaatar|Mongolia|47.89|106.91
Sydney|Australia|-33.87|151.21
Melbourne|Australia|-37.81|144.96
Brisbane|Australia|-27.47|153.03
Perth|Australia|-31.95|115.86
Auckland|New Zealand|-36.85|174.76
Wellington|New Zealand|-41.29|174.78
Los Angeles|United States|34.05|-118.24
San Francisco|United States|37.77|-122.42
San Diego|United States|32.72|-117.16
Seattle|United States|47.61|-122.33
Portland|United States|45.52|-122.68
Las Vegas|United States|36.17|-115.14
Phoenix|United States|33.45|-112.07
Denver|United States|39.74|-104.99
Austin|United States|30.27|-97.74
Dallas|United States|32.78|-96.80
Houston|United States|29.76|-95.37
Chicago|United States|41.88|-87.63
Detroit|United States|42.33|-83.05
Minneapolis|United States|44.98|-93.27
Atlanta|United States|33.75|-84.39
Miami|United States|25.76|-80.19
Nashville|United States|36.16|-86.78
Washington|United States|38.91|-77.04
Philadelphia|United States|39.95|-75.17
Boston|United States|42.36|-71.06
Pittsburgh|United States|40.44|-79.99
Salt Lake City|United States|40.76|-111.89
Honolulu|United States|21.31|-157.86
Anchorage|United States|61.22|-149.90
Toronto|Canada|43.65|-79.38
Montreal|Canada|45.50|-73.57
Vancouver|Canada|49.28|-123.12
Calgary|Canada|51.05|-114.07
Ottawa|Canada|45.42|-75.70
Mexico City|Mexico|19.43|-99.13
Guadalajara|Mexico|20.66|-103.35
Monterrey|Mexico|25.69|-100.32
Havana|Cuba|23.11|-82.37
San Juan|Puerto Rico|18.47|-66.11
San Salvador|El Salvador|13.69|-89.22
Guatemala City|Guatemala|14.63|-90.51
Panama City|Panama|8.98|-79.52
San José|Costa Rica|9.93|-84.09
Bogotá|Colombia|4.71|-74.07
Medellín|Colombia|6.24|-75.58
Caracas|Venezuela|10.48|-66.90
Quito|Ecuador|-0.18|-78.47
Lima|Peru|-12.05|-77.04
La Paz|Bolivia|-16.49|-68.12
Santiago|Chile|-33.45|-70.67
Buenos Aires|Argentina|-34.60|-58.38
Montevideo|Uruguay|-34.90|-56.16
Asunción|Paraguay|-25.26|-57.58
São Paulo|Brazil|-23.55|-46.63
Rio de Janeiro|Brazil|-22.91|-43.17
Brasília|Brazil|-15.79|-47.88
Florianópolis|Brazil|-27.60|-48.55
`;

export const CITIES: City[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [name, country, lat, lon] = line.split("|");
    return { id: `${name}, ${country}`.toLowerCase(), name, country, lat: +lat, lon: +lon };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

/** The tower's own site, where the creator's lamp burns. */
export const SHOREHAM: City = { id: "shoreham", name: "Wardenclyffe", country: "Shoreham, New York", lat: 40.95, lon: -72.89 };

export function cityByLabel(label: string): City | null {
  const id = label.trim().toLowerCase();
  return CITIES.find((c) => c.id === id) ?? null;
}
