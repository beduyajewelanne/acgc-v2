import React, { useState } from 'react';
import './SignUpForm.css';

const PH_GEOGRAPHY_REGISTRY = {
  "Abra": ["Bangued", "Boliney", "Bucay", "Bucloc", "Daguioman", "Danglas", "Dolores", "La Paz", "Lacub", "Lagangilang", "Lagayan", "Langiden", "Licuan-Baay", "Luba", "Malibcong", "Manabo", "Peñarrubia", "Pidigan", "Pilar", "Sallapadan", "San Isidro", "San Juan", "San Quintin", "Tayum", "Tineg", "Tubo", "Villaviciosa"],
  "Agusan del Norte": ["Buenavista", "Butuan City", "Cabadbaran City", "Carmen", "Kitcharao", "Las Nieves", "Magallanes", "Nasipit", "Remedios T. Romualdez", "Santiago", "Tubay"],
  "Agusan del Sur": ["Bayugan City", "Bunawan", "Esperanza", "Loreto", "Prosperidad", "Rosario", "San Francisco", "San Luis", "Santa Josefa", "Sibagat", "Talacogon", "Trento", "Veruela"],
  "Aklan": ["Altavas", "Batan", "Buruanga", "Balete", "Banga", "Ibajay", "Kalibo", "Lezo", "Libacao", "Madalag", "Makato", "Malay", "Malinao", "Nabas", "New Washington", "Numancia", "Tangalan"],
  "Albay": ["Bacacay", "Camalig", "Daraga", "Guinobatan", "Jovellar", "Legazpi City", "Libon", "Ligao City", "Malilipot", "Malinao", "Manito", "Oas", "Pio Duran", "Polangui", "Rapu-Rapu", "Santo Domingo", "Tabaco City", "Tiwi"],
  "Antique": ["Anini-y", "Barbaza", "Belison", "Bugasong", "Caluya", "Culasi", "Hamtic", "Laua-an", "Libertad", "Pandam", "Patnongon", "San Jose de Buenavista", "San Remigio", "Sebaste", "Sibalom", "Tibiao", "Tobias Fornier", "Valderrama"],
  "Apayao": ["Calanasan", "Conner", "Flora", "Kabugao", "Luna", "Pudtol", "Santa Marcela"],
  "Aurora": ["Baler", "Casiguran", "Dilasag", "Dinalungan", "Dingalan", "Dipaculao", "Maria Aurora", "San Luis"],
  "Basilan": ["Isabela City", "Lamitan City", "Akbar", "Al-Barka", "Hadji Mohammad Ajul", "Hadji Muhtamad", "Lantawan", "Maluso", "Sumisip", "Tabuan-Lasa", "Tipo-Tipo", "Tuburan", "Ungkaya Pukan"],
  "Bataan": ["Abucay", "Bagac", "Balanga City", "Dinalupihan", "Hermosa", "Limay", "Mariveles", "Morong", "Orani", "Orion", "Pilar", "Samal"],
  "Batanes": ["Basco", "Itbayat", "Ivana", "Mahatao", "Sabtang", "Uyugan"],
  "Batangas": ["Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca", "Calatagan", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lipa City", "Lobo", "Mabini", "Malvar", "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Santo Tomas City", "Taal", "Talisay", "Tanauan City", "Taysan", "Tingloy", "Tuy"],
  "Benguet": ["Atok", "Baguio City", "Bakun", "Bokod", "Buguias", "Itogon", "Kabayan", "Kapangan", "Kibungan", "La Trinidad", "Mankayan", "Sablan", "Tuba", "Tublay"],
  "Biliran": ["Almeria", "Biliran", "Cabucgayan", "Caibiran", "Culaba", "Kawayan", "Maripipi", "Naval"],
  "Bohol": ["Alburquerque", "Alicia", "Andanda", "Antequera", "Baclayon", "Balilihan", "Batuan", "Bien Unido", "Bilar", "Buenavista", "Calape", "Candijay", "Carmen", "Catigbian", "Clarin", "Corella", "Cortes", "Dagohoy", "Danao", "Dauis", "Dimiao", "Duero", "Garcia Hernandez", "Getafe", "Guindulman", "Inabanga", "Jagna", "Lila", "Loay", "Loboc", "Loon", "Mabini", "Maribojoc", "Panglao", "Pilar", "President Carlos P. Garcia", "Sagbayan", "San Isidro", "San Miguel", "Sevilla", "Sierra Bullones", "Sikatuna", "Tagbilaran City", "Talibon", "Trinidad", "Tubigon", "Ubay", "Valencia"],
  "Bukidnon": ["Baungon", "Cabanglasan", "Damulog", "Dangcagan", "Don Carlos", "Impasugong", "Kadingilan", "Kalilangan", "Kibawe", "Kitaotao", "Lantapan", "Libona", "Malaybalay City", "Malitbog", "Manolo Fortich", "Maramag", "Pangantucan", "Quezon", "San Fernando", "Sumilao", "Talakag", "Valencia City"],
  "Bulacan": ["Angat", "Balagtas", "Baliwag City", "Bocaue", "Bulakan", "Bustos", "Calumpit", "Doña Remedios Trinidad", "Guiguinto", "Hagonoy", "Malolos City", "Marilao", "Meycauayan City", "Norzagaray", "Obando", "Pandi", "Paombong", "Plaridel", "Pulilan", "San Ildefonso", "San Jose del Monte City", "San Miguel", "San Rafael", "Santa Maria"],
  "Cagayan": ["Abulug", "Alcala", "Allacapan", "Amulung", "Aparri", "Baggao", "Ballesteros", "Buguey", "Calayan", "Camalaniugan", "Claveria", "Enrile", "Gattaran", "Gonzaga", "Iguig", "Lal-lo", "Lasam", "Pamplona", "Peñablanca", "Piat", "Rizal", "Sanchez-Mira", "Santa Ana", "Santa Praxedes", "Santa Teresita", "Santo Niño", "Solana", "Tuao", "Tuguegarao City"],
  "Camarines Norte": ["Basud", "Capalonga", "Daet", "Jose Panganiban", "Labo", "Mercedes", "Paracale", "San Lorenzo Ruiz", "San Vicente", "Santa Elena", "Talisay", "Vinzons"],
  "Camarines Sur": ["Baao", "Balatan", "Bato", "Bombon", "Buhi", "Bula", "Cabusao", "Calabanga", "Camaligan", "Canaman", "Caramoan", "Del Gallego", "Gainza", "Garchitorena", "Goa", "Iriga City", "Lagonoy", "Libmanan", "Lupi", "Magarao", "Milaor", "Minalabac", "Nabua", "Naga City", "Ocampo", "Pamplona", "Pasacao", "Pili", "Presentacion", "Ragay", "Sagñay", "San Fernando", "San Jose", "Sipocot", "Siruma", "Tigaon", "Tinambac"],
  "Camiguin": ["Catarman", "Guinsiliban", "Mahinog", "Mambajao", "Sagay"],
  "Capiz": ["Cuartero", "Dumalag", "Dumarao", "Ivisan", "Jamindan", "Maayon", "Mambusao", "Panay", "Panitan", "Pilar", "Pontevedra", "President Roxas", "Roxas City", "Sapi-an", "Sigma", "Tapaz"],
  "Catanduanes": ["Bagamanoc", "Baras", "Bato", "Caramoran", "Gigmoto", "Pandan", "Panganiban", "San Andres", "San Miguel", "Viga", "Virac"],
  "Cavite": ["Alfonso", "Amadeo", "Bacoor City", "Carmona City", "Cavite City", "Dasmariñas City", "General Emilio Aguinaldo", "General Mariano Alvarez", "General Trias City", "Imus City", "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic", "Noveleta", "Rosario", "Silang", "Tagaytay City", "Tanza", "Ternate", "Trece Martires City"],
  "Cebu": ["Alcantara", "Alcoy", "Alegria", "Aloguinsan", "Argao", "Asturias", "Badian", "Balamban", "Bantayan", "Barili", "Bogo City", "Boljoon", "Borbon", "Carcar City", "Carmen", "Catmon", "Cebu City", "Compostela", "Consolacion", "Cordova", "Daanbantayan", "Danao City", "Dumanjug", "Ginatilan", "Lapu-Lapu City", "Liloan", "Madridejos", "Mandaue City", "Medellin", "Minglanilla", "Moalboal", "Naga City", "Oslob", "Pilar", "Pinamungajan", "Poro", "Ronda", "Samboan", "San Fernando", "San Francisco", "San Remigio", "Santa Fe", "Santander", "Sibonga", "Sogod", "Tabuelan", "Talisay City", "Toledo City", "Tuburan", "Tudela"],
  "Cotabato": ["Kidapawan City", "Alamada", "Aleosan", "Antipas", "Arakan", "Banisilan", "Carmen", "Kabacan", "Libungan", "M'lang", "Magpet", "Makilala", "Matalam", "Midsayap", "Pigcawayan", "Pikit", "President Roxas", "Tulunan"],
  "Davao de Oro": ["Compostela", "Laak", "Mabini", "Maco", "Maragusan", "Mawab", "Monkayo", "Montevista", "Nabunturan", "New Bataan", "Pantukan"],
  "Davao del Norte": ["Asuncion", "Braulio E. Dujali", "Carmen", "Kapalong", "New Corella", "Panabo City", "Samal City", "San Isidro", "Santo Tomas", "Tagum City", "Talaingod"],
  "Davao del Sur": ["Davao City", "Digos City", "Bansalan", "Hagonoy", "Kiblawan", "Magsaysay", "Malalag", "Matanao", "Padada", "Santa Cruz", "Sulop"],
  "Davao Occidental": ["Don Marcelino", "Jose Abad Santos", "Malita", "Santa Maria", "Sarangani"],
  "Davao Oriental": ["Baganga", "Banaybanay", "Boston", "Caraga", "Cateel", "Governor Generoso", "Lupon", "Manay", "Mati City", "San Isidro", "Tarragona"],
  "Dinagat Islands": ["Basilisa", "Cagdianao", "Dinagat", "Libjo", "Loreto", "San Jose", "Tubajon"],
  "Eastern Samar": ["Arteche", "Balangiga", "Balangkayan", "Borongan City", "Can-avid", "Dolores", "General MacArthur", "Giporlos", "Guiuan", "Hernani", "Jipapad", "Lawaan", "Llorente", "Maslog", "Maydolong", "Mercedes", "Oras", "Quinapondan", "Salcedo", "San Julian", "San Policarpo", "Sulat", "Taft"],
  "Guimaras": ["Buenavista", "Jordan", "Nueva Valencia", "San Lorenzo", "Sibunag"],
  "Ifugao": ["Aguinaldo", "Asipulo", "Banaue", "Hingyon", "Hungduan", "Kiangan", "Lagawe", "Lamut", "Mayoyao", "Alfonso Lista", "Tinoc"],
  "Ilocos Norte": ["Adams", "Bacarra", "Badoc", "Bangui", "Banna", "Batac City", "Burgos", "Carasi", "Currimao", "Dingras", "Dumalneg", "Laoag City", "Marcos", "Nueva Era", "Pagudpud", "Paoay", "Pasuquin", "Piddig", "Pinili", "San Nicolas", "Sarrat", "Solsona", "Vintar"],
  "Ilocos Sur": ["Candon City", "Vigan City", "Alilem", "Banayoyo", "Bantay", "Burgos", "Cabugao", "Caoayan", "Cervantes", "Galimuyod", "Gregorio del Pilar", "Magsingal", "Nagbukel", "Narvacan", "Quirino", "Salcedo", "San Emilio", "San Esteban", "San Ildefonso", "San Juan", "San Vicente", "Santa", "Santa Catalina", "Santa Cruz", "Santa Lucia", "Santa Maria", "Santiago", "Santo Domingo", "Sigay", "Sinait", "Sugpon", "Suyo", "Tagudin"],
  "Iloilo": ["Ajuy", "Alimodian", "Anilao", "Badiangan", "Balasan", "Banate", "Barotac Nuevo", "Barotac Viejo", "Batad", "Bingawan", "Cabatuan", "Calinog", "Carles", "Concepcion", "Dingle", "Dueñas", "Dumangas", "Estancia", "Guimbal", "Igbaras", "Iloilo City", "Janiuay", "Lambunao", "Leganes", "Lemery", "Leon", "Maasin", "Miagao", "New Lucena", "Oton", "Passi City", "Pavia", "Pototan", "San Dionisio", "San Enrique", "San Joaquin", "San Miguel", "San Rafael", "Santa Barbara", "Sara", "Tigbauan", "Tubungan", "Zarraga"],
  "Isabela": ["Alicia", "Angadanan", "Aurora", "Benito Soliven", "Burgos", "Cabagan", "Cabanatuan City", "Cauayan City", "Cordon", "Delfin Albano", "Divilacan", "Echague", "Gamu", "Ilagan City", "Jones", "Luna", "Maconacon", "Mallig", "Naguilian", "Palanan", "Quezon", "Quirino", "Ramon", "Reina Mercedes", "Roxas", "San Agustin", "San Guillermo", "San Isidro", "San Manuel", "San Mariano", "San Mateo", "San Pablo", "Santa Maria", "Santiago City", "Santo Tomas", "Tumauini"],
  "Kalinga": ["Balbalan", "Lubuagan", "Pasil", "Pinukpuk", "Rizal", "Tabuk City", "Tanudan", "Tinglayan"],
  "La Union": ["Agoo", "Aringay", "Bacnotan", "Bagulin", "Balaoan", "Bangar", "Bauang", "Burgos", "Caba", "Luna", "Naguilian", "Pugo", "Rosario", "San Fernando City", "San Gabriel", "San Juan", "Santo Tomas", "Santol", "Sudipen", "Tubao"],
  "Laguna": ["Alaminos", "Bay", "Biñan City", "Cabuyao City", "Calamba City", "Calauan", "Cavinti", "Famy", "Kalayaan", "Liliw", "Los Baños", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete", "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "San Pablo City", "San Pedro City", "Santa Cruz", "Santa Maria", "Santa Rosa City", "Siniloan", "Victoria"],
  "Lanao del Norte": ["Iligan City", "Bacolod", "Baloi", "Baroy", "Kapatagan", "Kauswagan", "Kolambugan", "Lala", "Linamon", "Magsaysay", "Maigo", "Matungao", "Munai", "Nunungan", "Pantao Ragat", "Pantar", "Poona Piagapo", "Salvador", "Sapad", "Sultan Naga Dimaporo", "Tagoloan", "Tangcal", "Tubod"],
  "Lanao del Sur": ["Marawi City", "Amai Manabilang", "Bacolod-Kalawi", "Balabagan", "Balindong", "Bayang", "Binidayan", "Buadiposo-Buntong", "Bubong", "Butig", "Calanogas", "Ditsaan-Ramain", "Ganassi", "Kapai", "Kapatagan", "Lumba-Bayabao", "Lumbaca-Unayan", "Lumbatan", "Lumbayanague", "Madalum", "Madamba", "Marantao", "Marogong", "Masiu", "Mulondo", "Pagayawan", "Piagapo", "Picong", "Poona Bayabao", "Pualas", "Saguiaran", "Sultan Dumalondong", "Tagoloan II", "Tamparan", "Taraka", "Tubaran", "Tugaya", "Wao"],
  "Leyte": ["Abuyog", "Alangalang", "Albuera", "Babatngon", "Barugo", "Bato", "Baybay City", "Burauen", "Calubian", "Capoocan", "Carigara", "Dagami", "Dulag", "Hilongos", "Hindang", "Inopacan", "Isabel", "Jaro", "Javier", "Julita", "Kananga", "La Paz", "Leyte", "MacArthur", "Mahaplag", "Matag-ob", "Matalom", "Mayorga", "Merida", "Ormoc City", "Palo", "Palompon", "Pastrana", "San Isidro", "San Miguel", "Santa Fe", "Tabango", "Tabontabon", "Tacloban City", "Tanauan", "Tolosa", "Tunga", "Villaba"],
  "Maguindanao del Norte": ["Cotabato City", "Datu Blah T. Sinsuat", "Datu Odin Sinsuat", "Kabuntalan", "Matanog", "Northern Kabuntalan", "Parang", "Sultan Kudarat", "Sultan Mastura", "Upi"],
  "Maguindanao del Sur": ["Ampatuan", "Buluan", "Datu Abdullah Sangki", "Datu Anggal Midtimbang", "Datu Hoffer Ampatuan", "Datu Montawal", "Datu Paglas", "Datu Piang", "Datu Salibo", "Datu Saudi-Ampatuan", "Datu Unsay", "Gen. S.K. Pendatun", "Guindulungan", "Mamasapano", "Mangudadatu", "Paglat", "Paglangan", "Rajah Buayan", "Shariff Aguak", "Shariff Saydona Mustapha", "South Upi", "Sultan sa Barongis", "Talayan"],
  "Marinduque": ["Boac", "Buenavista", "Gasan", "Mogpog", "Santa Cruz", "Torrijos"],
  "Masbate": ["Aroroy", "Baleno", "Balud", "Batuan", "Cataingan", "Cawayan", "Claveria", "Dimasalang", "Esperanza", "Mandaon", "Masbate City", "Milagros", "Mobo", "Monreal", "Palanas", "Pio V. Corpuz", "Placer", "San Fernando", "San Jacinto", "San Pascual", "Uson"],
  "Metro Manila": ["Caloocan City", "Las Piñas City", "Makati City", "Malabon City", "Mandaluyong City", "Manila", "Marikina City", "Muntinlupa City", "Navotas City", "Parañaque City", "Pasay City", "Pasig City", "Quezon City", "San Juan City", "Taguig City", "Valenzuela City", "Pateros"],
  "Misamis Occidental": ["Aloran", "Baliangao", "Bonifacio", "Calamba", "Clarin", "Concepcion", "Jimenez", "Lopez Jaena", "Oroquieta City", "Ozamiz City", "Panaon", "Plaridel", "Sapang Dalaga", "Sinacaban", "Tangub City", "Tudela"],
  "Misamis Oriental": ["Alubijid", "Balingasag", "Balingoan", "Binuangan", "Cagayan de Oro City", "Claveria", "El Salvador City", "Gingoog City", "Gitagum", "Initao", "Jasaan", "Kinoguitan", "Lagonglong", "Laguindingan", "Libertad", "Lugait", "Magsaysay", "Manticao", "Medina", "Naawan", "Opol", "Salay", "Sugbongcogon", "Tagoloan", "Talisayan", "Villanueva"],
  "Mountain Province": ["Barlig", "Bauko", "Besao", "Bontoc", "Natonin", "Paracelis", "Sabangan", "Sadanga", "Sagada", "Tadian"],
  "Negros Occidental": ["Bacolod City", "Bago City", "Binalbagan", "Cadiz City", "Calatrava", "Candoni", "Cauayan", "Enrique B. Magalona", "Escalante City", "Himamaylan City", "Hinigaran", "Hinoba-an", "Ilog", "Isabela", "Kabankalan City", "La Carlota City", "La Castellana", "Manapla", "Moises Padilla", "Murcia", "Pontevedra", "Pulupandan", "Sagay City", "San Carlos City", "San Enrique", "Silay City", "Sipalay City", "Talisay City", "Toboso", "Valladolid", "Victorias City"],
  "Negros Oriental": ["Amlan", "Ayungon", "Bacong", "Bais City", "Basay", "Bindoy", "Canlaon City", "Dauin", "Dumaguete City", "Guihulngan City", "Jimalalud", "La Libertad", "Mabinay", "Manjuyod", "Pamplona", "Siaton", "Sibulan", "Tanjay City", "Tayasan", "Valencia", "Vallehermoso", "Zamboanguita"],
  "Northern Samar": ["Allen", "Biri", "Bobon", "Capul", "Catarman", "Catubig", "Gamay", "Laoang", "Lapinig", "Las Navas", "Lavezares", "Lope de Vega", "Mapanas", "Mondragon", "Palapag", "Pambujan", "Rosario", "San Antonio", "San Isidro", "San Jose", "San Roque", "San Vicente", "Silvino Lobos", "Victoria"],
  "Nueva Ecija": ["Aliaga", "Bongabon", "Cabanatuan City", "Cabiao", "Carranglan", "Cuyapo", "Gabaldon", "General Mamerto Natividad", "General Tinio", "Guimba", "Jaen", "Laur", "Licab", "Llanera", "Lupao", "Muñoz Science City", "Nampicuan", "Palayan City", "Pantabangan", "Peñaranda", "Quezon", "Rizal", "San Antonio", "San Isidro", "San Jose City", "San Leonardo", "Santa Rosa", "Santo Domingo", "Talavera", "Talugtug", "Zaragoza"],
  "Nueva Vizcaya": ["Alfonso Castañeda", "Ambaguio", "Aritao", "Bagabag", "Bambang", "Bayombong", "Diadi", "Dupax del Norte", "Dupax del Sur", "Kasibu", "Kayapa", "Quezon", "Solano", "Santa Fe", "Villaverde"],
  "Occidental Mindoro": ["Abra de Ilog", "Calintaan", "Looc", "Lubang", "Magsaysay", "Mamburao", "Paluan", "Rizal", "Sablayan", "San Jose", "Santa Cruz"],
  "Oriental Mindoro": ["Baco", "Bansud", "Bongabong", "Bulalacao", "Calapan City", "Gloria", "Mansalay", "Naujan", "Pinamalayan", "Pola", "Puerto Galera", "Roxas", "San Teodoro", "Socorro", "Victoria"],
  "Palawan": ["Aborlan", "Agutaya", "Araceli", "Balabac", "Bataraza", "Brooke's Point", "Busuanga", "Cagayancillo", "Coron", "Culion", "Cuyo", "Dumaran", "El Nido", "Linapacan", "Magsaysay", "Narra", "Puerto Princesa City", "Quezon", "Rizal", "Roxas", "San Vicente", "Sofronio Española", "Taytay"],
  "Pampanga": ["Angeles City", "Apalit", "Arayat", "Bacolor", "Candaba", "Floridablanca", "Guagua", "Lubao", "Mabalacat City", "Macabebe", "Magalang", "Masantol", "Mexico", "Minalin", "Porac", "San Fernando City", "San Luis", "San Simon", "Santa Ana", "Santa Rita", "Santo Tomas", "Sasmuan"],
  "Pangasinan": ["Agno", "Aguilar", "Alaminos City", "Alcala", "Anda", "Asingan", "Balungao", "Bani", "Basista", "Bautista", "Bayambang", "Binalonan", "Binmaley", "Bolinao", "Bugallon", "Burgos", "Calasiao", "Dagupan City", "Dasol", "Infanta", "Labrador", "Laoac", "Lingayen", "Mabini", "Malasiqui", "Manaoag", "Mangaldan", "Mangatarem", "Mapandan", "Natividad", "Pozorrubio", "Rosales", "San Carlos City", "San Fabian", "San Jacinto", "San Manuel", "San Nicolas", "Santa Barbara", "Santa Maria", "Santo Tomas", "Sison", "Sual", "Tayug", "Umingan", "Urdaneta City", "Urbiztondo", "Villasis"],
  "Quezon": ["Agdangan", "Alabat", "Atimonan", "Buenavista", "Burdeos", "Calauag", "Candelaria", "Catanauan", "Dolores", "General Luna", "General Nakar", "Guinayangan", "Gumaca", "Infanta", "Jomalig", "Lopez", "Lucban", "Lucena City", "Macalelon", "Mauban", "Mulanay", "Padre Burgos", "Pagbilao", "Panukulan", "Patnanungan", "Perez", "Pitogo", "Plaridel", "Polillo", "Quezon", "Real", "Sampaloc", "San Andres", "San Antonio", "San Francisco", "San Narciso", "Sariaya", "Tagkawayan", "Tayabas City", "Tiaong", "Unisan"],
  "Quirino": ["Aglipay", "Cabarroguis", "Diffun", "Maddela", "Nagtipunan", "Saguday"],
  "Rizal": ["Angono", "Antipolo City", "Baras", "Binangonan", "Cainta", "Cardona", "Jala-jala", "Morong", "Pililla", "Rodriguez", "San Mateo", "Tanay", "Taytay", "Teresa"],
  "Romblon": ["Alcantara", "Banton", "Cajidiocan", "Calatrava", "Concepcion", "Corcuera", "Ferrol", "Looc", "Magdiwang", "Odiongan", "Romblon", "San Agustin", "San Andres", "San Fernando", "San Jose", "Santa Fe", "Santa Maria"],
  "Samar": ["Almagro", "Basey", "Calbayog City", "Calbiga", "Catbalogan City", "Daram", "Gandara", "Hinabangan", "Jiabong", "Marabut", "Matuguinao", "Motiong", "Pagsanghan", "Paranas", "Pinabacdao", "San Jorge", "San Jose de Buan", "San Sebastian", "Santa Margarita", "Santa Rita", "Santo Niño", "Tagapul-an", "Talalora", "Tarangnan", "Villareal", "Zumarraga"],
  "Sarangani": ["Alabel", "Glan", "Kiamba", "Maasim", "Maitum", "Malapatan", "Malungon"],
  "Siquijor": ["Enrique Villanueva", "Larena", "Lazi", "Maria", "San Juan", "Siquijor"],
  "Sorsogon": ["Bulan", "Bulusan", "Casiguran", "Castilla", "Donsol", "Gubat", "Irosin", "Juban", "Magallanes", "Matnog", "Pilar", "Prieto Diaz", "Santa Magdalena", "Sorsogon City", "Barcelona"],
  "South Cotabato": ["General Santos City", "Koronadal City", "Banga", "Lake Sebu", "Norala", "Polomolok", "Santo Niño", "Surallah", "T'Boli", "Tampakan", "Tantangan", "Tupi"],
  "Southern Leyte": ["Anahawan", "Bontoc", "Hinunangan", "Hinundayan", "Libagon", "Liloan", "Limasawa", "Maasin City", "Macrohon", "Malitbog", "Padre Burgos", "Pintuyan", "San Francisco", "San Juan", "San Ricardo", "Saint Bernard", "Sogod", "Tomas Oppus"],
  "Sultan Kudarat": ["Tacurong City", "Bagumbayan", "Columbio", "Esperanza", "Isulan", "Kalamansig", "Lambayong", "Lebak", "Lutayan", "Palimbang", "President Quirino", "Sen. Ninoy Aquino"],
  "Sulu": ["Banguingui", "Hadji Panglima Tahil", "Indanan", "Jolo", "Kalingalan Caluang", "Lugus", "Luuk", "Maimbung", "Old Panamao", "Omar", "Pandami", "Panglima Estino", "Pangutaran", "Parang", "Pata", "Patikul", "Siasi", "Talipao", "Tapul"],
  "Surigao del Norte": ["Burgos", "Claver", "Dapa", "Del Carmen", "General Luna", "Gigaquit", "Mainit", "Malimono", "Pilar", "Placer", "San Benito", "San Francisco", "San Isidro", "Santa Monica", "Sison", "Socorro", "Surigao City", "Tagana-an", "Tubod"],
  "Surigao del Sur": ["Barobo", "Bayabas", "Bislig City", "Cagwait", "Cantilan", "Carmen", "Carrascal", "Cortes", "Hinatuan", "Lanuza", "Lianga", "Lingig", "Madrid", "Marihatag", "San Agustin", "San Miguel", "Tagbina", "Tago", "Tandag City"],
  "Tarlac": ["Anao", "Bamban", "Camiling", "Capas", "Concepcion", "Gerona", "La Paz", "Mayantoc", "Moncada", "Paniqui", "Pura", "Ramos", "San Clemente", "San Manuel", "San Jose", "Santa Ignacia", "Tarlac City", "Victoria"],
  "Tawi-Tawi": ["Bongao", "Languyan", "Mapun", "Panglima Sugala", "Sapa-Sapa", "Sibutu", "Simunul", "Sitangkai", "South Ubian", "Turtle Islands"],
  "Zambales": ["Botolan", "Cabangan", "Candelaria", "Castillejos", "Iba", "Masinloc", "Olongapo City", "Palauig", "San Antonio", "San Felipe", "San Marcelino", "San Narciso", "Santa Cruz", "Subic"],
  "Zamboanga del Norte": ["Baliguian", "Dapitan City", "Dipolog City", "Godod", "Gutalac", "Jose Dalman", "Kalawit", "Katipunan", "La Libertad", "Labason", "Leon B. Postigo", "Liloy", "Manukan", "Mutia", "Piñan", "Polanco", "Pres. Manuel A. Roxas", "Rizal", "Salug", "Sergio Osmeña Sr.", "Siayan", "Sibuco", "Sibutad", "Sindangan", "Siocon", "Sirawai", "Tampilisan"],
  "Zamboanga del Sur": ["Aurora", "Bayog", "Dimataling", "Dinas", "Dumalinao", "Dumingag", "Guipos", "Josefina", "Kumalarang", "Labangan", "Lakewood", "Lapuyan", "Mahayag", "Margosatubig", "Midsalip", "Molave", "Pagadian City", "Ramon Magsaysay", "San Miguel", "San Pablo", "Sominot", "Tamboang", "Tigbao", "Tukuran", "Vincenzo A. Sagun", "Zamboanga City"],
  "Zamboanga Sibugay": ["Alicia", "Buug", "Diplahan", "Imelda", "Ipil", "Kabasalan", "Mabuhay", "Malangas", "Naga", "Olutanga", "Payao", "Roseller Lim", "Siay", "Talusan", "Titay", "Tungawan"]
};

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    address: '',
    province: '',
    city: '',
    barangay: '',
    zipCode: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  const [feedback, setFeedback] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [citiesList, setCitiesList] = useState([]);
  
  // Track visibility state of the global document terms overlay modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProvinceChange = (e) => {
    const selectedProvince = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      province: selectedProvince, 
      city: '', 
      barangay: '' 
    }));
    
    if (selectedProvince && PH_GEOGRAPHY_REGISTRY[selectedProvince]) {
      setCitiesList(PH_GEOGRAPHY_REGISTRY[selectedProvince]);
    } else {
      setCitiesList([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const passwordRequirements = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*()_+\-=[\]{};:'",.<>/?\\|`~]/.test(formData.password),
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = [];

    if (!formData.termsAccepted) {
      errors.push('You must accept the Terms and Conditions.');
    }
    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match.');
    }
    if (formData.password.length < 8 || !passwordRequirements.upper || !passwordRequirements.lower || !passwordRequirements.number || !passwordRequirements.special) {
      errors.push('Password does not meet all secure parameters.');
    }

    if (errors.length > 0) {
      setFeedback(errors);
    } else {
      setFeedback([]);
      alert("Registration Successful!");
      console.log("Form Output Payload: ", formData);
    }
  };

  return (
    <div className="signup-page-wrapper">
      <div className="signup-page">
        <div className="signup-card">
          
          <aside className="su-brand-panel">
            <div className="brand-panel-inner">
              <div className="brand-logo-wrap">
                <img src="/images/MainLogo.png" alt="ACGC Logo" />
              </div>
              <div className="brand-copy">
                <span className="brand-small">WELCOME TO</span>
                <h2>ACGC</h2>
                <p>Securely manage products, site inspections,<br />and operations from one powerful dashboard.</p>
              </div>
              <ul className="brand-features">
                <li>Instant account verification</li>
                <li>Trusted workflow visibility</li>
                <li>Easy access to inspections, orders, and transactions</li>
              </ul>
            </div>
          </aside>

          <section className="su-form-panel">
            <div className="form-center">
              <div className="form-badge">SECURE SIGN-UP</div>
              <h1>Create your ACGC account</h1>
              <p className="form-subtitle">Verify your email to activate your profile.</p>

              {feedback.length > 0 && (
                <div className="error-box">
                  {feedback.map((msg, index) => (
                    <p key={index} className="feedback-message">{msg}</p>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="signup-form">
                
                {/* --- PERSONAL DETAILS --- */}
                <div className="form-group span-6">
                  <label htmlFor="firstName">First Name *</label>
                  <input 
                    type="text" id="firstName" name="firstName" 
                    placeholder="John" value={formData.firstName} 
                    onChange={handleInputChange} required 
                  />
                </div>

                <div className="form-group span-6">
                  <label htmlFor="lastName">Last Name *</label>
                  <input 
                    type="text" id="lastName" name="lastName" 
                    placeholder="Doe" value={formData.lastName} 
                    onChange={handleInputChange} required 
                  />
                </div>

                <div className="form-group span-6">
                  <label htmlFor="email">Email Address *</label>
                  <input 
                    type="email" id="email" name="email" 
                    placeholder="john@example.com" value={formData.email} 
                    onChange={handleInputChange} required 
                  />
                </div>

                <div className="form-group span-6">
                  <label htmlFor="phone">Phone Number *</label>
                  <input 
                    type="tel" id="phone" name="phone" 
                    placeholder="+63 912 345 6789" value={formData.phone} 
                    onChange={handleInputChange} required 
                  />
                </div>

                {/* --- PHYSICAL ADDRESS BLOCK --- */}
                <div className="form-group span-12">
                  <label htmlFor="address">Street Address / Unit / House No. *</label>
                  <input 
                    type="text" id="address" name="address" 
                    placeholder="Room 402, Building Floor 4" value={formData.address} 
                    onChange={handleInputChange} required 
                  />
                </div>

                <div className="form-group span-3">
                  <label htmlFor="province">Province *</label>
                  <select id="province" name="province" value={formData.province} onChange={handleProvinceChange} required>
                    <option value="">Select Province</option>
                    {Object.keys(PH_GEOGRAPHY_REGISTRY).map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group span-3">
                  <label htmlFor="city">City / Municipality *</label>
                  <select id="city" name="city" value={formData.city} onChange={handleInputChange} disabled={!citiesList.length} required>
                    <option value="">Select City</option>
                    {citiesList.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group span-3">
                  <label htmlFor="barangay">Barangay *</label>
                  <input 
                    type="text" id="barangay" name="barangay" 
                    placeholder="Enter Barangay" value={formData.barangay} 
                    onChange={handleInputChange} required 
                  />
                </div>

                <div className="form-group span-3">
                  <label htmlFor="zipCode">Zip Code *</label>
                  <input 
                    type="text" id="zipCode" name="zipCode" 
                    placeholder="2200" value={formData.zipCode} 
                    onChange={handleInputChange} required 
                  />
                </div>

                {/* --- SYSTEM CREDENTIALS --- */}
                <div className="form-group span-12">
                  <label htmlFor="username">Username *</label>
                  <input 
                    type="text" id="username" name="username" 
                    placeholder="choose_username" value={formData.username} 
                    onChange={handleInputChange} required 
                  />
                </div>

                <div className="form-group span-6 relative-container">
                  <label htmlFor="password">Password *</label>
                  <input 
                    type="password" id="password" name="password" 
                    placeholder="••••••••" value={formData.password}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onChange={handleInputChange} required 
                  />
                  
                  {isFocused && (
                    <div className="password-strength-panel">
                      <p className="strength-title">Password Requirements:</p>
                      <ul className="strength-list">
                        <li className={passwordRequirements.length ? "met" : "unmet"}>
                          <span className="indicator-icon">{passwordRequirements.length ? '✓' : '✕'}</span> 8+ characters
                        </li>
                        <li className={passwordRequirements.upper ? "met" : "unmet"}>
                          <span className="indicator-icon">{passwordRequirements.upper ? '✓' : '✕'}</span> 1 uppercase letter
                        </li>
                        <li className={passwordRequirements.lower ? "met" : "unmet"}>
                          <span className="indicator-icon">{passwordRequirements.lower ? '✓' : '✕'}</span> 1 lowercase letter
                        </li>
                        <li className={passwordRequirements.number ? "met" : "unmet"}>
                          <span className="indicator-icon">{passwordRequirements.number ? '✓' : '✕'}</span> 1 number
                        </li>
                        <li className={passwordRequirements.special ? "met" : "unmet"}>
                          <span className="indicator-icon">{passwordRequirements.special ? '✓' : '✕'}</span> 1 special character
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="form-group span-6">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <input 
                    type="password" id="confirmPassword" name="confirmPassword" 
                    placeholder="••••••••" value={formData.confirmPassword} 
                    onChange={handleInputChange} required 
                  />
                  {formData.confirmPassword && (
                    <p className={`match-indicator ${formData.password === formData.confirmPassword ? 'match' : 'no-match'}`}>
                      {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                <div className="form-group span-12 terms-container">
                  <label className="terms-label-row">
                    <input 
                      type="checkbox" 
                      name="termsAccepted" 
                      className="custom-checkbox-input"
                      checked={formData.termsAccepted} 
                      onChange={handleInputChange} 
                    />
                    <span className="terms-text">
                      I accept the <button type="button" className="terms-modal-trigger-btn" onClick={() => setIsModalOpen(true)}>Terms and Conditions</button> and <button type="button" className="terms-modal-trigger-btn" onClick={() => setIsModalOpen(true)}>Privacy Policy</button>
                    </span>
                  </label>
                </div>

                <button type="submit" className="signup-btn span-12">Verify Email</button>

                <div className="signup-footer span-12">
                  <p>Already have an account? <a href="/login">Login</a></p>
                </div>
              </form>
            </div>
          </section>

        </div>
      </div>

      {/* --- MODAL DIALOG PORTAL OVERLAY --- */}
      {isModalOpen && (
        <div className="modal-backdrop-layer" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content-header">
              <h2>Terms and Conditions & Privacy Policy</h2>
              <button type="button" className="modal-x-close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <div className="modal-content-body">
              <h3>Terms and Conditions</h3>
              
              <h4>1. Acceptance of Terms</h4>
              <p>By creating an account and using this platform, you agree to comply with these Terms and Conditions and all applicable laws and regulations.</p>

              <h4>2. Eligibility</h4>
              <p>Users must be at least 18 years old or meet the minimum legal age required in their jurisdiction to register an account.</p>

              <h4>3. Account Registration</h4>
              <p>You agree to provide accurate, complete, and up-to-date information during registration. Providing false information may result in account suspension or termination.</p>

              <h4>4. Account Responsibility</h4>
              <p>You are responsible for maintaining the confidentiality of your login credentials and for all activities conducted under your account.</p>

              <h4>5. Acceptable Use</h4>
              <p>Users agree not to:</p>
              <ul>
                <li>Use the platform for unlawful purposes</li>
                <li>Impersonate another person or entity</li>
                <li>Upload harmful, abusive, or malicious content</li>
                <li>Attempt unauthorized access to accounts or systems</li>
                <li>Interfere with platform operations or security</li>
              </ul>

              <h4>6. Intellectual Property</h4>
              <p>All content, logos, trademarks, and materials available on the platform are the property of the company or respective owners and are protected by applicable intellectual property laws.</p>

              <h4>7. Suspension or Termination</h4>
              <p>The platform reserves the right to suspend or terminate accounts that violate these Terms and Conditions without prior notice.</p>

              <h4>8. Limitation of Liability</h4>
              <p>The platform is provided “as is” without warranties of any kind. The company shall not be liable for any damages arising from the use or inability to use the platform.</p>

              <h4>9. Changes to Terms</h4>
              <p>The company may update these Terms and Conditions at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.</p>

              <h4>10. Governing Law</h4>
              <p>These Terms and Conditions shall be governed by the laws applicable in the jurisdiction where the company operates.</p>

              <hr className="modal-section-separator" />

              <h3>Privacy Policy</h3>

              <h4>1. Information Collection</h4>
              <p>We may collect the following information when you create an account or use the platform:</p>
              <ul>
                <li>Full name</li>
                <li>Email address</li>
                <li>Contact number</li>
                <li>Username and password</li>
                <li>Device and usage information</li>
              </ul>

              <h4>2. Use of Information</h4>
              <p>Collected information may be used to:</p>
              <ul>
                <li>Create and manage your account</li>
                <li>Provide platform services</li>
                <li>Improve user experience</li>
                <li>Send important notifications or updates</li>
                <li>Maintain security and prevent fraud</li>
              </ul>

              <h4>3. Data Protection</h4>
              <p>We implement reasonable security measures to protect your personal information from unauthorized access, disclosure, or misuse.</p>

              <h4>4. Information Sharing</h4>
              <p>Your personal information will not be sold or rented to third parties. Information may only be shared when:</p>
              <ul>
                <li>Required by law</li>
                <li>Necessary to provide services</li>
                <li>Needed to protect platform security and users</li>
              </ul>

              <h4>5. Cookies and Tracking</h4>
              <p>The platform may use cookies and similar technologies to improve functionality and analyze usage patterns.</p>

              <h4>6. User Rights</h4>
              <p>Users may request access, correction, or deletion of their personal information subject to applicable laws and regulations.</p>

              <h4>7. Data Retention</h4>
              <p>Personal information will only be retained for as long as necessary to fulfill the purposes stated in this Privacy Policy or as required by law.</p>

              <h4>8. Third-Party Services</h4>
              <p>The platform may contain links or integrations with third-party services. We are not responsible for the privacy practices of third-party providers.</p>

              <h4>9. Changes to Privacy Policy</h4>
              <p>We reserve the right to update this Privacy Policy at any time. Changes become effective upon posting on the platform.</p>

              <h4>10. Contact Information</h4>
              <p>For questions or concerns regarding these Terms and Conditions or Privacy Policy, users may contact the platform administrator through official communication channels.</p>
            </div>
            
            <div className="modal-content-footer">
              <button type="button" className="modal-footer-close-btn" onClick={() => setIsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUpForm;