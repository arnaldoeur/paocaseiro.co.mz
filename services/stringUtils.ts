/**
 * Formats a string to have only the first letter capitalized and the rest lowercase.
 * Example: "PÃO CASEIRO" -> "Pão caseiro"
 * Example: "pão caseiro" -> "Pão caseiro"
 */
export const formatProductName = (name: string): string => {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.length === 0) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

export const productNameTranslations: Record<string, string> = {
    'Cachorro quente completo': 'Full Hot Dog',
    'Hambúrguer completo': 'Full Burger',
    'Shawarma de galinha': 'Chicken Shawarma',
    'Shawarma de carne': 'Beef Shawarma',
    'Cachorro quente': 'Hot Dog',
    'Hambúrguer simples': 'Simple Burger',
    'Pizza mexicana': 'Mexican Pizza',
    'Pizza de frango': 'Chicken Pizza',
    'Pizza de peperoni': 'Pepperoni Pizza',
    'Pizza 4 estacões': '4 Seasons Pizza',
    'Pizza de palony': 'Polony Pizza',
    'Mini pizza diversos un': 'Mini Pizzas Assorted',
    'Café pingado': 'Macchiato',
    'Café especial': 'Special Coffee',
    'Café gelado': 'Iced Coffee',
    'Café espresso': 'Espresso',
    'Chá simples': 'Simple Tea',
    'Chá de leite': 'Milk Tea',
    'Chá especial': 'Special Tea',
    'Cupcake normal': 'Regular Cupcake',
    'Cakes / fatias': 'Cake Slices',
    'Fatias xadrez': 'Checkerboard Slices',
    'Pastel de nata': 'Pastel de Nata',
    'Bolo de arroz': 'Rice Cake',
    'Donuts': 'Donuts',
    'Charruto recheado': 'Stuffed Cigar Pastry',
    'Pudim': 'Pudding',
    'Queques': 'Muffins',
    'Palmier recheado': 'Stuffed Palmier',
    'Torta': 'Swiss Roll',
    'Waffle stick': 'Waffle Stick',
    'Folhado recheado': 'Stuffed Puff Pastry',
    'Beijinhos de coco': 'Coconut Kisses',
    'Biscoitos amanteigados': 'Butter Cookies',
    'Caracol de canela': 'Cinnamon Roll',
    'Croisant recheado': 'Stuffed Croissant',
    'Bolo t26': 'Cake Size 26',
    'Bolo t22': 'Cake Size 22',
    'Pasteis de coco': 'Coconut Pastries',
    'Guardanapo recheado c/ creme': 'Cream Filled Napkin Pastry',
    'Brioche de frutas': 'Fruit Brioche',
    'Broche rechado': 'Stuffed Brioche',
    'Bolo t14': 'Cake Size 14',
    'Mini folhados grama': 'Mini Puff Pastry (grams)',
    'Nevada': 'Nevada Cake',
    'Bolo t18': 'Cake Size 18',
    'Croisant simples': 'Simple Croissant',
    'Bola de berlim': 'Berliner',
    'Fatias normal': 'Normal Slices',
    'Palmier simples': 'Simple Palmier',
    'Folhado de salsicha': 'Sausage Roll',
    'Mini pizza': 'Mini Pizza',
    'Samosas / chamussas (50 cada)': 'Samosas',
    'Rissóis de camarão': 'Shrimp Patties',
    'Almofadinha': 'Puff Pillow',
    'Calzone': 'Calzone',
    'Chamussas de frango': 'Chicken Samosas',
    'Chamussas de vegetais': 'Vegetable Samosas',
    'Empadas': 'Pies',
    'Empada de carne': 'Meat Pie',
    'Folhados de carne': 'Meat Puff Pastries',
    'Coxinhas': 'Coxinhas',
    'Empadas de frango': 'Chicken Pies',
    'Rissois': 'Patties',
    'King pie frango/carne': 'King Pie Chicken/Meat',
    'Mini subs': 'Mini Subs',
    'Pão Tradicional': 'Whole Wheat Bread',
    'Pão Integral': 'Whole Wheat Bread',
    'Pão Quente': 'Warm Bread',
    'Pão de Leite': 'Milk Bread',
    'Pão de Hamburguer': 'Burger Bun',
    'Pão de Cachorro': 'Hot Dog Bun',
    'Pão Forma': 'Sliced Bread',
    'Pão caseiro': 'Homemade Bread',
    'Mini pao de forma intergral 250g': 'Mini Whole Wheat Sliced Bread 250g',
    'Paozinho de leite 100g': 'Milk Bread Roll 100g',
    'Pao portugues': 'Portuguese Bread',
    'Pao de cereais c/ sementes': 'Cereal Bread with Seeds',
    'Pao de forma 500g': 'Sliced Bread 500g',
    'Pao de forma integral 500g': 'Whole Wheat Sliced Bread 500g',
    'Pao caseiro grande': 'Large Homemade Bread',
    'Pao de humbuger/ cachoro': 'Burger/Hot Dog Bun',
    'Pao integral peq': 'Small Whole Wheat Bread',
    'Saco de torrada': 'Bag of Toast',
    'Pao normal 80g': 'Normal Bread 80g',
    'Broa de milho': 'Cornbread',
    'Pão de queijo': 'Cheese Bread',
    'Lingua da sogra 80g': 'Mother-in-law\'s Tongue 80g',
    'Pao de forma cereais': 'Cereal Sliced Bread',
    'Pao caserio 100g': 'Homemade Bread 100g',
    'Pao normal 50g': 'Normal Bread 50g',
    'Chamussas de peixe': 'Fish Samosas',
    'Chamussas de carne': 'Meat Samosas',
    'Pizza de atum': 'Tuna Pizza',
    'Espresso': 'Espresso',
    'Fanta laranja': 'Orange Fanta'
};

export const productDescTranslations: Record<string, string> = {
    'Cachorro quente completo': 'Soft bun with sausage and condiments of choice.',
    'Cakes / fatias': 'Generous slice of homemade cake.',
    'Fatias xadrez': 'Fun cake with a two-flavor checkerboard pattern.',
    'Pastel de nata': 'The ex-libris of Portuguese sweets: puff pastry and creamy egg custard.',
    'Bolo de arroz': 'Traditional cake made with rice flour, with a unique texture.',
    'Donuts': 'Fried dough with classic sweet glaze.',
    'Pudim': 'Homemade egg pudding, smooth and topped with caramel.',
    'Queques': 'Simple and fluffy individual cake, perfect for a snack.',
    'Palmier recheado': 'Two layers of palmier filled with sweet cream.',
    'Torta': 'Sweet homemade roll, perfect with coffee.',
    'Waffle stick': 'Delicious waffle on a stick, crispy outside and soft inside.',
    'Nevada': 'Fluffy cake topped with white cream and coconut.',
    'Bola de berlim': 'Fluffy fried dough, filled with our homemade pastry cream.',
    'Folhado de salsicha': 'Tasty sausage wrapped in golden puff pastry.',
    'Mini pizza': 'Small individual pizza with cheese and tomato sauce.',
    'Samosas / chamussas (50 cada)': 'Typical triangular pastry with spiced filling.',
    'Rissóis de camarão': 'Breaded half-moon with creamy shrimp filling.',
    'Empadas': 'Tender shortcrust pastry with creamy filling.',
    'Folhados de carne': 'Well-seasoned minced meat filling in puff pastry.',
    'Croissants simples': 'Brioche-type croissant, soft and tasty.',
    'Croissants chocolate': 'Filled with rich chocolate cream.',
    'Coxinhas': 'Traditional savory with creamy filling and crispy dough.',
    'Pão Tradicional': 'Fresh and crispy, baked multiple times a day.',
    'Pão Integral': 'Fresh and crispy, baked multiple times a day.'
};

export const getEnglishProductName = (name: string): string => {
    if (!name) return '';
    // Exact match first
    if (productNameTranslations[name]) return productNameTranslations[name];
    
    // Case/accent insensitive match
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const normalizedName = normalize(name);
    
    for (const [key, value] of Object.entries(productNameTranslations)) {
        if (normalize(key) === normalizedName) {
            return value;
        }
    }
    
    // Common string manipulations if still not found
    if (normalizedName.includes('fanta laranja')) return 'Orange Fanta';
    if (normalizedName.includes('pizza de atum')) return 'Tuna Pizza';
    if (normalizedName.includes('peixe')) return 'Fish Samosas'; // mostly used for chamussas de peixe
    
    return name;
};

export const getEnglishProductDesc = (name: string): string => {
    return productDescTranslations[name] || '';
};
