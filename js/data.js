/* BMChores — données de référence (sections, idées, plan de ménage, rayons) */
window.BM = window.BM || {};

BM.CATEGORIES = [
  { id: 'menage',    label: 'Ménage',               emoji: '🧽', color: '#4FB3BF', kid: true },
  { id: 'repas',     label: 'Repas & cuisine',      emoji: '🍽️', color: '#F2994A', kid: true },
  { id: 'sante',     label: 'Santé',                emoji: '🩺', color: '#EB5757', kid: true },
  { id: 'ecole',     label: 'École & éducation',    emoji: '🎒', color: '#6C8CFF', kid: true },
  { id: 'animaux',   label: 'Animaux',              emoji: '🐾', color: '#B07D62', kid: true },
  { id: 'maison',    label: 'Maison & logement',    emoji: '🏠', color: '#27AE60', kid: true },
  { id: 'finances',  label: 'Finances & budget',    emoji: '💶', color: '#2D9CDB', kid: false },
  { id: 'admin',     label: 'Papiers & démarches',  emoji: '📑', color: '#828CA0', kid: false },
  { id: 'loisirs',   label: 'Loisirs & activités',  emoji: '🎨', color: '#BB6BD9', kid: true },
  { id: 'weekend',   label: 'Week-ends',            emoji: '🌤️', color: '#F2C94C', kid: true },
  { id: 'vacances',  label: 'Vacances',             emoji: '🏖️', color: '#00B8A9', kid: true },
  { id: 'fetes',     label: 'Anniversaires & fêtes',emoji: '🎂', color: '#FF6F91', kid: true },
  { id: 'voiture',   label: 'Voiture & transports', emoji: '🚗', color: '#5D6D7E', kid: false },
  { id: 'vetements', label: 'Vêtements',            emoji: '👕', color: '#9B8AFB', kid: true },
  { id: 'jardin',    label: 'Jardin & plantes',     emoji: '🌱', color: '#6FCF97', kid: true },
  { id: 'social',    label: 'Famille & amis',       emoji: '💌', color: '#F78FB3', kid: true },
  { id: 'couple',    label: 'Couple',               emoji: '💑', color: '#E84393', kid: false },
  { id: 'moi',       label: 'Prendre soin de soi',  emoji: '🧘', color: '#A29BFE', kid: true },
  { id: 'autre',     label: 'Divers',               emoji: '📌', color: '#95A5A6', kid: true }
];

/* Idées « pour ne rien oublier » par section : [titre, répétition]
   répétition : none | daily | weekly | monthly | monthly:N | yearly */
BM.IDEAS = {
  sante: [
    ['Rendez-vous dentiste (contrôle)', 'monthly:6'],
    ['Visite chez le pédiatre / médecin', 'yearly'],
    ['Vérifier le carnet de vaccination', 'yearly'],
    ['Renouveler les ordonnances', 'monthly:3'],
    ['Contrôle ophtalmo', 'yearly'],
    ['Trier l\'armoire à pharmacie (dates de péremption)', 'yearly'],
    ['Envoyer les remboursements à la mutuelle', 'monthly'],
    ['Racheter paracétamol / pansements', 'none']
  ],
  ecole: [
    ['Signer le cahier de liaison', 'weekly'],
    ['Préparer le cartable', 'daily'],
    ['Payer la cantine', 'monthly'],
    ['Réunion parents-professeurs', 'none'],
    ['Acheter les fournitures scolaires', 'yearly'],
    ['Inscription périscolaire / centre de loisirs', 'yearly'],
    ['Assurance scolaire', 'yearly'],
    ['Lire une histoire / devoirs ensemble', 'daily'],
    ['Photo de classe à commander', 'none']
  ],
  repas: [
    ['Planifier les menus de la semaine', 'weekly'],
    ['Faire les courses', 'weekly'],
    ['Préparer les goûters', 'weekly'],
    ['Batch cooking du dimanche', 'weekly'],
    ['Vérifier les dates du frigo', 'weekly'],
    ['Préparer les lunchbox', 'none']
  ],
  animaux: [
    ['Nourrir les animaux', 'daily'],
    ['Changer la litière / nettoyer la cage', 'weekly'],
    ['Vermifuge', 'monthly:3'],
    ['Anti-puces / anti-tiques', 'monthly'],
    ['Vaccins chez le vétérinaire', 'yearly'],
    ['Racheter croquettes', 'monthly'],
    ['Promenade', 'daily']
  ],
  finances: [
    ['Faire le point sur le budget du mois', 'monthly'],
    ['Vérifier les prélèvements et abonnements', 'monthly'],
    ['Payer le loyer / crédit', 'monthly'],
    ['Déclaration d\'impôts', 'yearly'],
    ['Épargne pour les enfants', 'monthly'],
    ['Comparer assurances et énergie', 'yearly'],
    ['Argent de poche', 'weekly']
  ],
  maison: [
    ['Changer les piles des détecteurs de fumée', 'yearly'],
    ['Entretien de la chaudière', 'yearly'],
    ['Relever les compteurs', 'monthly'],
    ['Changer les ampoules grillées', 'none'],
    ['Purger les radiateurs', 'yearly'],
    ['Renouveler l\'assurance habitation', 'yearly'],
    ['Petites réparations à faire', 'none'],
    ['Sortir les poubelles', 'weekly']
  ],
  admin: [
    ['Vérifier la date d\'expiration des passeports / cartes d\'identité', 'yearly'],
    ['Classer les papiers et factures', 'monthly'],
    ['Attestation CAF / mutuelle à jour', 'yearly'],
    ['Renouveler la carte Vitale / carte de transport', 'none'],
    ['Résilier un abonnement inutile', 'none']
  ],
  loisirs: [
    ['Inscription aux activités (sport, musique…)', 'yearly'],
    ['Payer la cotisation du club', 'yearly'],
    ['Certificat médical pour le sport', 'yearly'],
    ['Préparer le sac de sport', 'weekly'],
    ['Sortie culturelle (musée, cinéma, théâtre)', 'monthly']
  ],
  weekend: [
    ['Organiser le programme du week-end', 'weekly'],
    ['Activité en famille (balade, parc, jeux)', 'weekly'],
    ['Inviter des amis / la famille', 'monthly'],
    ['Soirée jeux de société', 'weekly'],
    ['Grasse matinée et pancakes 🥞', 'weekly']
  ],
  vacances: [
    ['Choisir la destination', 'none'],
    ['Réserver logement et transport', 'none'],
    ['Demander les congés', 'none'],
    ['Faire la liste des valises', 'none'],
    ['Faire garder les animaux', 'none'],
    ['Inscrire les enfants en centre de loisirs / colonie', 'none'],
    ['Vérifier les papiers d\'identité', 'none'],
    ['Programmer les vacances scolaires dans l\'agenda', 'yearly']
  ],
  fetes: [
    ['Acheter le cadeau d\'anniversaire', 'none'],
    ['Organiser la fête d\'anniversaire', 'none'],
    ['Envoyer les invitations', 'none'],
    ['Cadeaux de Noël', 'yearly'],
    ['Cadeau fête des mères / des pères', 'yearly'],
    ['Cadeau de fin d\'année pour la maîtresse / le maître', 'yearly']
  ],
  voiture: [
    ['Contrôle technique', 'monthly:24'],
    ['Révision / vidange', 'yearly'],
    ['Changer les pneus hiver / été', 'monthly:6'],
    ['Renouveler l\'assurance auto', 'yearly'],
    ['Faire le plein', 'none'],
    ['Lavage de la voiture', 'monthly']
  ],
  vetements: [
    ['Trier les vêtements trop petits', 'monthly:6'],
    ['Changer la garde-robe (été / hiver)', 'monthly:6'],
    ['Acheter des chaussures (pointure !)', 'none'],
    ['Donner / vendre les vêtements', 'none']
  ],
  jardin: [
    ['Arroser les plantes', 'weekly'],
    ['Tondre la pelouse', 'weekly'],
    ['Rempoter les plantes', 'yearly'],
    ['Tailler les haies', 'monthly:6']
  ],
  social: [
    ['Appeler les grands-parents', 'weekly'],
    ['Envoyer des nouvelles / photos à la famille', 'monthly'],
    ['Organiser un repas de famille', 'monthly'],
    ['Répondre aux invitations', 'none']
  ],
  couple: [
    ['Soirée en amoureux', 'monthly'],
    ['Réserver une baby-sitter', 'monthly'],
    ['Point de la semaine à deux (organisation)', 'weekly'],
    ['Anniversaire de mariage', 'yearly']
  ],
  moi: [
    ['Un moment rien que pour moi', 'weekly'],
    ['Sport / marche', 'weekly'],
    ['Rendez-vous coiffeur', 'monthly:2'],
    ['Lire un livre', 'weekly'],
    ['Voir une amie', 'monthly']
  ],
  autre: [
    ['Rendre les livres à la bibliothèque', 'none'],
    ['Récupérer un colis', 'none']
  ]
};

/* Plan de ménage type : pièce -> [titre, fréquence] ; w = hebdo, m = mensuel, o = ponctuel */
BM.ROOMS = [
  { id: 'cuisine', label: 'Cuisine', emoji: '🍳' },
  { id: 'sdb', label: 'Salle de bain & WC', emoji: '🛁' },
  { id: 'chambres', label: 'Chambres', emoji: '🛏️' },
  { id: 'salon', label: 'Salon', emoji: '🛋️' },
  { id: 'entree', label: 'Entrée', emoji: '🚪' },
  { id: 'linge', label: 'Linge', emoji: '🧺' },
  { id: 'exterieur', label: 'Extérieur', emoji: '🌳' },
  { id: 'general', label: 'Toute la maison', emoji: '✨' }
];

BM.CLEANING_PLAN = {
  cuisine: [
    ['Nettoyer le plan de travail et les plaques', 'w'],
    ['Vider et nettoyer la poubelle', 'w'],
    ['Laver le sol', 'w'],
    ['Nettoyer le frigo', 'm'],
    ['Nettoyer le micro-ondes', 'm'],
    ['Détartrer la bouilloire / cafetière', 'm'],
    ['Nettoyer le four', 'm'],
    ['Dégivrer le congélateur', 'o'],
    ['Nettoyer le filtre de la hotte', 'o']
  ],
  sdb: [
    ['Lavabo, douche et baignoire', 'w'],
    ['Nettoyer les WC', 'w'],
    ['Changer les serviettes', 'w'],
    ['Laver le sol', 'w'],
    ['Détartrer robinets et pommeau', 'm'],
    ['Laver le tapis et le rideau de douche', 'm'],
    ['Nettoyer les joints', 'o']
  ],
  chambres: [
    ['Changer les draps', 'w'],
    ['Aspirer', 'w'],
    ['Ranger les jouets 🧸', 'w'],
    ['Dépoussiérer les meubles', 'm'],
    ['Aérer et retourner les matelas', 'o'],
    ['Trier les jouets à donner', 'o']
  ],
  salon: [
    ['Aspirer et passer la serpillière', 'w'],
    ['Dépoussiérer', 'w'],
    ['Nettoyer écrans et télécommandes', 'm'],
    ['Aspirer le canapé', 'm'],
    ['Laver les rideaux', 'o'],
    ['Nettoyer les vitres', 'o']
  ],
  entree: [
    ['Ranger chaussures et manteaux', 'w'],
    ['Secouer le paillasson', 'w'],
    ['Nettoyer portes, poignées et interrupteurs', 'm']
  ],
  linge: [
    ['Faire les lessives', 'w'],
    ['Plier et ranger le linge', 'w'],
    ['Repassage', 'w'],
    ['Nettoyer le filtre et le joint de la machine', 'm']
  ],
  exterieur: [
    ['Balayer terrasse / balcon', 'm'],
    ['Nettoyer le barbecue', 'o'],
    ['Nettoyer les gouttières', 'o']
  ],
  general: [
    ['Grand ménage de printemps', 'o'],
    ['Désencombrer un placard', 'o'],
    ['Nettoyer les plinthes', 'o']
  ]
};

/* Rayons pour les listes de courses (détection automatique par mot-clé) */
BM.AISLES = [
  { id: 'fruits', label: 'Fruits & légumes', emoji: '🥕', words: ['pomme','banane','poire','orange','citron','fraise','raisin','kiwi','tomate','carotte','salade','courgette','poivron','oignon','ail','pomme de terre','patate','concombre','avocat','brocoli','champignon','épinard','haricot','melon','pastèque','clémentine','mandarine','fruit','légume','persil','basilic','herbe','poireau','chou','aubergine','radis','mangue','ananas','cerise','pêche','abricot','prune','courge','potiron','betterave','échalote','gingembre','menthe','coriandre'] },
  { id: 'frais', label: 'Frais & crèmerie', emoji: '🧀', words: ['lait','yaourt','yogourt','fromage','beurre','crème','oeuf','œuf','jambon','lardon','compote','dessert','skyr','mozzarella','emmental','comté','gruyère','parmesan','feta','chèvre','camembert','raclette','petit suisse','fromage blanc','pâte feuilletée','pâte brisée'] },
  { id: 'viande', label: 'Viande & poisson', emoji: '🍗', words: ['poulet','boeuf','bœuf','steak','porc','dinde','saucisse','viande','poisson','saumon','thon','cabillaud','crevette','agneau','veau','escalope','filet','merguez','haché','jambon cru','chorizo'] },
  { id: 'boulangerie', label: 'Boulangerie', emoji: '🥖', words: ['pain','baguette','brioche','croissant','viennoiserie','pain de mie','biscotte','tortilla','wrap','gâteau'] },
  { id: 'epicerie', label: 'Épicerie', emoji: '🥫', words: ['pâtes','pate','riz','farine','sucre','sel','poivre','huile','vinaigre','céréales','cereale','confiture','miel','chocolat','café','thé','biscuit','gâteaux','conserve','sauce','ketchup','moutarde','mayonnaise','épice','lentille','pois chiche','semoule','quinoa','chips','compote','nutella','pâte à tartiner','levure','bouillon','soupe','olive','thon en boîte','maïs','haricots rouges','cacao','bonbon','goûter'] },
  { id: 'surgeles', label: 'Surgelés', emoji: '🧊', words: ['surgelé','glace','frites','pizza','poisson pané','légumes surgelés','glaçon','sorbet'] },
  { id: 'boissons', label: 'Boissons', emoji: '🧃', words: ['eau','jus','soda','sirop','bière','vin','limonade','coca','lait végétal','boisson'] },
  { id: 'bebe', label: 'Bébé & enfants', emoji: '🍼', words: ['couche','lingette','petit pot','lait infantile','biberon','tétine'] },
  { id: 'hygiene', label: 'Hygiène & beauté', emoji: '🧴', words: ['shampoing','shampooing','gel douche','savon','dentifrice','brosse à dents','déodorant','coton','rasoir','papier toilette','mouchoir','crème solaire','serviette hygiénique','tampon','gel','après-shampoing','pansement'] },
  { id: 'entretien', label: 'Entretien & maison', emoji: '🧹', words: ['lessive','adoucissant','liquide vaisselle','pastille','éponge','sac poubelle','essuie-tout','javel','nettoyant','vinaigre blanc','sopalin','papier alu','film','ampoule','pile','désodorisant','tablette lave-vaisselle'] },
  { id: 'animaux', label: 'Animaux', emoji: '🐾', words: ['croquette','litière','pâtée','friandise chien','friandise chat'] },
  { id: 'autre', label: 'Autres', emoji: '🛒', words: [] }
];

BM.AVATARS = ['👩','👨','👦','🧒','👧','👶','👵','👴','🦁','🐻','🦊','🐼','🐯','🐨','🦄','🐸','🐙','🦖','🚀','⚽','🌟','🎸','🦸','🧙'];
BM.COLORS = ['#FF7A8A','#6C8CFF','#2EC4B6','#FFB547','#9B8AFB','#4CAF50','#FF8C42','#3BA3E8'];

BM.MEAL_IDEAS = [
  'Pâtes bolognaise','Gratin de légumes','Poulet rôti & pommes de terre','Soupe & tartines','Croque-monsieur & salade',
  'Quiche lorraine','Hachis parmentier','Tacos maison','Pizza maison','Omelette & salade','Riz cantonais',
  'Lasagnes','Poisson pané & purée','Curry de lentilles','Galettes / crêpes salées','Salade composée',
  'Chili con carne','Risotto aux champignons','Burgers maison','Saumon & riz'
];

BM.DEFAULT_REWARDS = [
  { title: 'Choisir le dessert', emoji: '🍰', cost: 15 },
  { title: '15 min d\'écran en plus', emoji: '📺', cost: 20 },
  { title: 'Sortie au parc avec papa ou maman', emoji: '🛝', cost: 30 },
  { title: 'Soirée film en famille', emoji: '🍿', cost: 50 },
  { title: 'Petit jouet ou livre', emoji: '🎁', cost: 100 }
];

BM.REMINDERS = [
  { v: -1, label: 'Pas de rappel' },
  { v: 0, label: 'À l\'heure prévue' },
  { v: 15, label: '15 min avant' },
  { v: 60, label: '1 heure avant' },
  { v: 180, label: '3 heures avant' },
  { v: 1440, label: 'La veille' },
  { v: 2880, label: '2 jours avant' },
  { v: 10080, label: '1 semaine avant' }
];

BM.REPEATS = [
  { v: 'none', label: 'Une seule fois' },
  { v: 'daily', label: 'Tous les jours' },
  { v: 'weekly', label: 'Toutes les semaines' },
  { v: 'monthly', label: 'Tous les mois' },
  { v: 'yearly', label: 'Tous les ans' }
];

BM.DAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
BM.DAYS_LONG = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
BM.CHEERS = ['Bravo ! 🎉','Super boulot ! ⭐','Trop fort ! 💪','Génial ! 🌈','Mission accomplie ! 🚀','Champion ! 🏆','Youpi ! 🥳'];
