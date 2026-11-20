# Arma el léxico de pronunciación (RESP) para voz.js: forma escrita → cómo la dice una voz castellana sin cambiar de voz
import json, sys
sys.path.insert(0, '/tmp/titulos/v34')
auto = json.load(open('/tmp/titulos/v34/auto_en.json', encoding='utf-8'))
MAN_EN = {
 'JP Morgan': 'Yei Pi Mórgan', 'J.P. Morgan': 'Yei Pi Mórgan', 'JPMorgan': 'Yei Pi Mórgan', 'Citigroup': 'Sítigrup', 'Citibank': 'Sítibank',
 "Standard & Poor's": 'Stándard and Purs', 'S&P': 'Es and Pi', 'S&P Global': 'Es and Pi Glóbal', 'Scotiabank': 'Scotiabank',
 'Bank of America': 'Bank of Amérika', 'Dow Jones': 'Dau Yóuns', 'New York Stock Exchange': 'Niu York Stok Ekschéinch', 'Financial Times': 'Fainánshal Taims',
 'The Economist': 'Di Ikónomist', 'Wall Street Journal': 'Uol Strit Yérnal', 'New York Times': 'Niu York Taims', 'Washington Post': 'Uáshington Poust',
 'Oxford Economics': 'Óksford Ekonómiks', 'Barclays': 'Bárkleis', 'Western Union': 'Uéstern Yúnion', 'private equity': 'práivet ékuiti',
 'venture capital': 'vénchur kápital', 'joint venture': 'yoint vénchur', 'factoring': 'fáktoring', 'Fitch Ratings': 'Fich Réitings',
 'crowdfunding': 'kráudfanding', 'fintech': 'fíntek', 'proptech': 'próptek', 'insurtech': 'ínsurtek',
 'CEO': 'Si I Óu', 'CFO': 'Si Ef Óu', 'CTO': 'Si Ti Óu', 'COO': 'Si Óu Óu', 'IPO': 'Ai Pi Óu', 'KPI': 'Kei Pi Ái', 'MBA': 'Em Bi Éi', 'SaaS': 'Sas',
 'Apple': 'Ápol', 'Google': 'Gúgol', 'Microsoft': 'Máicrosoft', 'Meta': 'Meta', 'Instagram': 'Ínstagram', 'WhatsApp': 'Uatsáp', 'YouTube': 'Yutúb',
 'LinkedIn': 'Línkedin', 'Uber': 'Úber', 'SpaceX': 'Speis Éks', 'Nvidia': 'Envídia', 'Oracle': 'Órakol', 'Adobe': 'Adóubi', 'Cisco': 'Sísko',
 'iPhone': 'Áifon', 'iPad': 'Áipad', 'iOS': 'Ai Óu Es', 'Android': 'Android', 'Windows': 'Uíndous', 'PlayStation': 'Pléisteishon', 'Xbox': 'Éks Box',
 'GitHub': 'Guít Jab', 'McDonald\'s': 'Mac Dónalds', 'TikTok': 'Tíktok', 'Airbnb': 'Er bi en bi', 'Starlink': 'Stárlink', 'OpenAI': 'Ópen Ei Ái',
 'ChatGPT': 'Chat Yi Pi Tí', 'Anthropic': 'Antrópik', 'Fortnite': 'Fórtnait', 'Roblox': 'Róblox', 'Cornershop': 'Kórnershop',
 'Black Friday': 'Blak Fráidei', 'Cyber Monday': 'Sáiber Mándei', 'Cyber Day': 'Sáiber Déi', 'CyberDay': 'Sáiber Déi',
 'online': 'onláin', 'offline': 'ofláin', 'bluetooth': 'blútuz', 'router': 'rúter', 'newsletter': 'niúsleter', 'password': 'pásuord',
 'update': 'apdéit', 'upgrade': 'apgréid', 'e-commerce': 'i kómers', 'ecommerce': 'i kómers', 'smartwatch': 'smártuach', 'esports': 'i sports', 'e-sports': 'i sports',
 'influencer': 'ínfluenser', 'youtuber': 'yutúber', 'chatbot': 'chátbot', 'ransomware': 'ránsomuer', 'coworking': 'kouórking', 'home office': 'jóum ófis',
 'ranking': 'ránking', 'reality': 'riáliti', 'fashion': 'fáshion', 'glamour': 'glámur', 'premium': 'prímium', 'bunker': 'bánker',
 'US Open': 'Iu Es Óupen', 'Australian Open': 'Ostréilian Óupen', 'ATP Finals': 'A T P Fáinals', 'WTA Finals': 'W T A Fáinals', 'tie-break': 'tai bréik', 'tiebreak': 'tai bréik',
 'Premier League': 'Prémier Lig', 'Champions League': 'Chámpions Lig', 'Europa League': 'Európa Lig', 'Super Bowl': 'Súper Bóul',
 'PGA Tour': 'P G A Tur', 'PGA Championship': 'P G A Chámpionship', 'PGA': 'P G A', 'LPGA': 'L P G A', 'LIV Golf': 'Liv Golf', 'DP World Tour': 'Di Pi Uérld Tur',
 'The Open': 'Di Óupen', 'bogey': 'bóugui', 'double bogey': 'dábel bóugui', 'hole in one': 'jóul in uán', 'stroke play': 'stróuk plei', 'snowboard': 'snóubord',
 'pole position': 'póul posíshon', 'Ironman': 'Áironman', 'crossfit': 'krósfit', 'McLaren': 'Mac Láren',
 'New York': 'Niu York', 'Houston': 'Jiúston', 'Philadelphia': 'Filadélfia', 'Augusta': 'Ogásta', 'Wimbledon': 'Uímbledon', 'Newcastle': 'Niúkasel',
 'Nottingham Forest': 'Nótingam Fórest', 'Edinburgh': 'Édimbra', 'Oxford': 'Óksford', 'Hong Kong': 'Hong Kong', 'Fulham': 'Fúlam', 'Wolverhampton': 'Uúlverjámpton',
 'Bournemouth': 'Bórnmuz', 'Brentford': 'Bréntford', 'Brooklyn': 'Brúklin',
 'Joe Biden': 'Yóu Báiden', 'Kamala Harris': 'Kámala Járis', 'Elon Musk': 'Ílon Mask', 'Jerome Powell': 'Yeróum Páuel', 'Mark Zuckerberg': 'Mark Súkerberg',
 'Bill Gates': 'Bil Guéits', 'Jeff Bezos': 'Yef Bésos', 'Beyoncé': 'Biyónsei', 'Paul McCartney': 'Pol Mac Cártni', 'Michael Jackson': 'Máikol Yákson',
 'Rolling Stones': 'Róling Stóuns', 'Coldplay': 'Kóldplei', 'Bad Bunny': 'Bad Báni', 'Tiger Woods': 'Táiguer Guds', 'Scottie Scheffler': 'Skóti Shéfler',
 'Rory McIlroy': 'Róri Mákilroi', 'Xander Schauffele': 'Sánder Shófeli', 'Bryson DeChambeau': 'Bráison Déshambou', 'Jordan Spieth': 'Yórdan Spiz',
 'Brooks Koepka': 'Bruks Képka', 'Frances Tiafoe': 'Fránsis Tiafó', 'Coco Gauff': 'Kóko Gof', 'Serena Williams': 'Serína Uíliams', 'Venus Williams': 'Vínus Uíliams',
 'Jessica Pegula': 'Yésika Pegúla', 'Andy Murray': 'Ándi Mári', 'LeBron James': 'Lebrón Yéims', 'Michael Jordan': 'Máikol Yórdan', 'Lando Norris': 'Lándo Nóris',
 'Jude Bellingham': 'Yud Bélingam', 'Linkedin': 'Línkedin',
}
MAN = {
 'fr': {'Roland Garros': 'Rolán Garrós', 'Tour de France': 'Tur de Frans', 'Grand Prix': 'Gran Pri', 'Paris Saint-Germain': 'Parí San Yermán', 'Saint-Germain': 'San Yermán',
  'Le Monde': 'Le Mond', 'Le Figaro': 'Le Fígaro', "L'Équipe": 'Lekíp', 'Champs-Élysées': 'Shans Elisé', 'Élysée': 'Elisé', 'Emmanuel Macron': 'Emanuel Macrón', 'Macron': 'Macrón',
  'Marine Le Pen': 'Marín Le Pen', 'Louis Vuitton': 'Luí Vuitón', 'Chanel': 'Shanel', 'Hermès': 'Ermés', 'Cartier': 'Cartié', 'Carrefour': 'Carfur', 'Renault': 'Renó',
  'Peugeot': 'Peyó', 'Citroën': 'Citroén', 'Michelin': 'Mishlán', "L'Oréal": 'Loreal', 'Danone': 'Danón', 'TotalEnergies': 'Total Enerjí', 'Airbus': 'Érbus',
  'BNP Paribas': 'Be Ene Pe Paribá', 'Société Générale': 'Sosieté Yeneral', 'Crédit Agricole': 'Credí Agricol', 'gourmet': 'gurmé', 'boutique': 'butík', 'croissant': 'cruasán',
  'champagne': 'champán', 'ballet': 'balé', 'bouquet': 'buké', 'souvenir': 'suvenír', 'déjà vu': 'deyavú', 'rendez-vous': 'randevú', 'savoir-faire': 'suavar fer',
  'foie gras': 'fua grá', 'à la carte': 'a la cart', 'avant-garde': 'avangard', 'haute couture': 'ot cutur', 'prêt-à-porter': 'pretaporté', 'Cannes': 'Can',
  'Montpellier': 'Montpelié', 'Marseille': 'Marséi', 'Bordeaux': 'Bordó', 'Toulouse': 'Tulús', 'Nantes': 'Nant', 'Strasbourg': 'Strasbur', 'Versailles': 'Versái',
  'Louvre': 'Luvr', 'Notre-Dame': 'Notr Dam', 'Montmartre': 'Monmartr', 'Ligue': 'Lig'},
 'pt': {'São Paulo': 'Sao Paulo', 'Grêmio': 'Gremio', 'Corinthians': 'Corintians', 'Folha de S.Paulo': 'Folia de Sao Paulo', 'Jair Bolsonaro': 'Yaír Bolsonaro',
  'Geraldo Alckmin': 'Yeraldo Alkmin', 'Alckmin': 'Alkmin', 'Vinícius Júnior': 'Vinísius Yúnior', 'Vini Jr.': 'Vini Yúnior', 'Itamaraty': 'Itamarati', 'reais': 'reáis'},
 'de': {'Bayern': 'Báyern', 'Deutsche Bank': 'Dóiche Bank', 'Deutsche Telekom': 'Dóiche Télekom', 'Volkswagen': 'Folksvaguen', 'Siemens': 'Símens', 'Bosch': 'Bosh',
  'Porsche': 'Pórshe', 'Friedrich Merz': 'Fridrij Merts', 'Merz': 'Merts', 'Olaf Scholz': 'Ólaf Sholts', 'Scholz': 'Sholts', 'Angela Merkel': 'Ánguela Merkel',
  'Leipzig': 'Láipsig', 'Schalke': 'Shalke', 'Wolfsburg': 'Volfsburg', 'Bayer Leverkusen': 'Báyer Léverkusen', 'Toni Kroos': 'Toni Krus', 'Kroos': 'Krus',
  'Ursula von der Leyen': 'Úrsula fon der Láien', 'von der Leyen': 'fon der Láien'},
 'it': {'Giorgia Meloni': 'Yóryia Meloni', 'Sergio Mattarella': 'Séryio Matarela', 'Mattarella': 'Matarela', 'Lamborghini': 'Lamborguini', 'Gucci': 'Guchi',
  'Versace': 'Versache', 'Pirelli': 'Pireli', 'Lavazza': 'Lavatsa', 'Barilla': 'Barila', 'cappuccino': 'capuchino', "Giro d'Italia": 'Yiro de Italia'},
}
# monosílabos o palabras que una voz castellana ya dice bien: se quedan como están (sin entrada)
QUEDAN = {'Instagram', 'Android', 'Meta', 'Uber', 'Hong Kong', 'Scotiabank', 'Roblox'}
R = {}
for k, v in auto.items():
    R[k] = MAN_EN.get(k, v)
for k, v in MAN_EN.items(): R[k] = v
for l, d in MAN.items():
    for k, v in d.items(): R[k] = v
for k in list(R):
    if k in QUEDAN or R[k] == k: del R[k]
json.dump(R, open('/tmp/titulos/v34/resp.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(R), 'entradas;', len(json.dumps(R, ensure_ascii=False)), 'caracteres')
for k in ['Walmart', 'Wall Street', 'Goldman Sachs', 'marketing', 'Scottie Scheffler', 'Peugeot', 'Volkswagen', 'online', 'CEO']: print(' ', k, '→', R.get(k))
