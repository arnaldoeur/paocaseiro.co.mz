
export type Language = 'pt' | 'en';

export const translations = {
    pt: {
        nav: {
            home: 'Início',
            about: 'Sobre',
            services: 'Serviços',
            classics: 'Clássicos',
            gallery: 'Galeria',
            contact: 'Contacto',

        },
        hero: {
            title: 'Pão Caseiro',
            subtitle: 'O sabor que aquece o coração.',
            description: 'Mais do que pão, entregamos carinho em forma de sabor. Produzido diariamente com ingredientes seleccionados, o nosso pão traz o conforto e a tradição que a sua família merece. Experimente o verdadeiro gosto de casa.',
            order: 'Fazer Encomenda',
            gallery: 'Ver Galeria',
            call: 'Ligue já: +258 846 930 960'
        },
        video: {
            title: 'Veja como nasce o nosso pão',
            subtitle: 'Um minuto na nossa cozinha: massa, forno e mãos que cuidam de cada fornada.',
            play: 'Reproduzir Vídeo'
        },
        about: {
            label: 'Sobre Nós',
            title: 'Um sabor caseiro que conta histórias',
            description: 'A Padaria Pão Caseiro oferece pães fresquinhos todos os dias, preparados de forma artesanal com ingredientes selecionados. Aqui você encontra sabor, qualidade e um atendimento que aquece o coração. Somos uma padaria tradicional, Moderna com ambiente acolhedor e produtos feitos com carinho para toda a família. Venha provar o verdadeiro sabor do pão caseiro na cidade!',
            quote: '"O verdadeiro sabor é feito sem pressa."',
            points: [
                'Produção artesanal, sem atalhos.',
                'Ingredientes locais selecionados.',
                'Fornos movidos pela tradição e pelo cuidado.'
            ]
        },
        services: {
            title: 'Nossos Serviços',
            items: [
                { title: 'Padaria', desc: 'Pães rústicos e doces de fornada diária.' },
                { title: 'Pastelaria', desc: 'Pastéis e salgados frescos.' },
                { title: 'Confeitaria', desc: 'Bolos e sobremesas personalizadas.' },
                { title: 'Café', desc: 'Bebidas preparadas com carinho.' }
            ]
        },
        classics: {
            title: 'Clássicos da casa que aquecem o coração',
            subtitle: '“Feito como se fosse para a família.”',
            cta: 'Encomendar Agora',
            items: [
                { title: 'Pão', desc: 'O nosso pão tradicional, fresco a toda a hora.' },
                { title: 'Pão Caseiro', desc: 'Aquele pão especial que é encomendado geralmente.' },
                { title: 'Croissants', desc: 'Folhados, recheados ou simples, sempre frescos.' },
                { title: 'Broa de Milho', desc: 'Broa densa e saborosa, feita com farinha de milho.' }
            ]
        },
        gallery: {
            title: 'Nossas Delícias',
            subtitle: 'Uma seleção dos nossos melhores produtos, feitos com carinho.',
            zoom: 'Ampliar',
            captions: [
                'O nosso espaço acolhedor',
                'Fornadas frescas todos os dias',
                'Preparado com carinho',
                'Variedade de sabores',
                'Detalhes artesanais',
                'Ingredientes selecionados',
                'Pastelaria fina',
                'Tradição e sabor',
                'Venha nos visitar',
                'Ambiente familiar',
                'O aroma do pão quente',
                'Nossas especialidades'
            ]
        },
        contact: {
            title: 'Encomende, reserve, fale connosco',
            subtitle: 'Entraremos em contacto para confirmar a encomenda.',
            form: {
                name: 'Nome',
                namePlaceholder: 'Seu nome',
                phone: 'Telefone',
                email: 'Email',
                message: 'Mensagem',
                messagePlaceholder: 'O que gostaria de encomendar ou perguntar?',
                send: 'Enviar Mensagem',
                success: 'Mensagem enviada com sucesso! Entraremos em contacto brevemente.',
                error: 'Erro ao enviar mensagem. Por favor, tente novamente.'
            },
            visit: {
                title: 'Visite-nos',
                desc: 'Criámos um espaço acolhedor e familiar, pensado ao pormenor para que se sinta em casa enquanto saboreia as nossas delícias.',
                locationLabel: 'Lichinga',
                location: 'Av. Acordo de Lusaka',
                phoneLabel: 'Ligue para nós',
                emailLabel: 'Email',
                emails: ['info@paocaseiro.co.mz', 'suporte@paocaseiro.co.mz']
            }
        },
        footer: {
            description: 'A Padaria Pão Caseiro oferece pães fresquinhos todos os dias, preparados de forma artesanal com ingredientes selecionados. Aqui você encontra sabor, qualidade e um atendimento que aquece o coração.',
            quickLinks: 'Links Rápidos',
            contacts: 'Contactos',
            rights: '© {year} Pão Caseiro. Todos os direitos reservados.',
            designed: 'Desenhado com 🤍 pela'
        },
        cart: {
            empty: 'Seu carrinho está vazio.',
            total: 'Total',
            subtotal: 'Subtotal',
            estimated_time: 'Tempo Estimado',
            min_order: 'Valor mínimo para entrega'
        },
        checkout: {
            title: 'Finalizar Pedido',
            details: 'Seus Dados',
            name: 'Nome Completo',
            phone: 'Telefone',
            address: 'Endereço (Ponto de Referência)',
            orderType: 'Tipo de Pedido',
            payment: 'Pagamento',
            delivery: 'Entrega',
            pickup: 'Levantar',
            dine_in: 'Mesa',
            continue: 'Continuar',
            back: 'Voltar',
            pay_now: 'Pagar Agora',
            summary: 'Resumo do Pedido',
            items: 'Itens'
        },
        menu: {
            add_to_cart: 'Adicionar',
            checkout_btn: 'Finalizar Compra',
            title: 'Nosso Menu',
            subtitle: 'Explore a nossa seleção de produtos frescos, feitos com dedicação diária.',
            order: 'Encomendar Agora',
            alert: 'Seu carrinho está vazio! Por favor, adicione itens antes de encomendar.',
            sections: [
                {
                    title: 'Pães',
                    items: [
                        { name: 'Pão Caseiro', price: 10, image: '/images/pao_caseiro.png', desc: 'O nosso pão tradicional, fresco a toda a hora.' },
                        { name: 'Pão Português', price: 10, image: '/images/pao_portugues.png', desc: 'Receita portuguesa autêntica, com côdea estaladiça e miolo fofo.' },
                        { name: 'Pão de Forma Integral', price: 80, image: '/images/pao_forma_integral.png', desc: 'Ideal para sandes equilibradas e saudáveis.' },
                        { name: 'Pão de Forma Simples', price: 60, image: '/images/pao_forma_simples.png', desc: 'Fofo e macio, perfeito para torradas ou sandes.' },
                        { name: 'Pão Integral', price: 12, image: '/images/pao_integral.png', desc: 'Rico em fibras, para uma alimentação mais saudável.' },
                        { name: 'Broa de Milho', price: 60, image: '/images/broa_milho.png', desc: 'Broa densa e saborosa, feita com farinha de milho.' },
                        { name: 'Pão de Cereais (com sementes)', price: 25, image: '/images/pao_cereais.png', desc: 'Pão saudável e nutritivo, rico em sementes selecionadas.' },
                        { name: 'Cachorro Quente Completo', price: 50, image: '/images/cachorro_quente.png', desc: 'Pão macio com salsicha e condimentos à escolha.' },
                    ]
                },
                {
                    title: 'Folhados & Salgados',
                    items: [
                        { name: 'Folhado de Salsicha', price: 70, image: '/images/folhado_salsicha.png', desc: 'Salsicha saborosa envolta em massa folhada dourada.' },
                        { name: 'Folhado Salsicha com Queijo', price: 70, image: '/images/folhado_salsicha_queijo.png', desc: 'O clássico folhado de salsicha com um toque de queijo derretido.' },
                        { name: 'Folhados de Carne', price: 100, image: '/images/folhados_carne.png', desc: 'Recheio de carne picada bem temperada em massa folhada.' },
                        { name: 'Folhados Recheados', price: 80, image: '/images/folhados_recheados.png', desc: 'Variedade de folhados com recheios deliciosos.' },
                        { name: 'Empadas', price: 100, image: '/images/empadas.png', desc: 'Massa quebrada tenra com recheio cremoso.' },
                        { name: 'Rissóis de Camarão', price: 50, image: '/images/rissois_camarao.png', desc: 'Meia-lua panada com recheio cremoso de camarão.' },
                        { name: 'Coxinhas', price: 50, image: '/images/coxinhas.png', desc: 'Salgado tradicional com recheio cremoso e massa crocante.' },
                        { name: 'Samosas / Chamussas (50 cada)', price: 50, image: '/images/samosas.png', desc: 'Pastel triangular típico, com recheio condimentado.' },
                        { name: 'Mini Folhados (kg)', price: 1000, image: '/images/mini_folhados.png', desc: 'Sortido de pequenos folhados, ideais para festas e snacks.' },
                        { name: 'Mini Pizza', price: 50, image: '/images/pizza_mexicana.png', desc: 'Pequena pizza individual com queijo e molho de tomate.' },
                    ]
                },
                {
                    title: 'Doces & Pastelaria',
                    items: [
                        { name: 'Palmier', price: 50, image: '/images/palmier.png', desc: 'Massa folhada caramelizada em formato de coração.' },
                        { name: 'Palmier Recheado', price: 100, image: '/images/palmier_recheado.png', desc: 'Duas camadas de palmier recheadas com creme doce.' },
                        { name: 'Pastel de Nata', price: 80, image: '/images/pastel_nata.png', desc: 'O ex-líbris da doçaria portuguesa: massa folhada e creme de ovos cremoso.' },
                        { name: 'Pastel de Coco', price: 80, image: '/images/pastel_coco.png', desc: 'Tartelete deliciosa com recheio rico de coco.' },
                        { name: 'Bola de Berlim', price: 80, image: '/images/bola_berlim.png', desc: 'Massa frita fofa, recheada com o nosso creme pasteleiro caseiro.' },
                        { name: 'Donuts', price: 80, image: '/images/donuts.png', desc: 'Rosquinha frita com cobertura doce clássica.' },
                        { name: 'Waffle Stick', price: 200, image: '/images/waffle_stick.png', desc: 'Delicioso waffle no palito, crocante por fora e macio por dentro.' },
                        { name: 'Queques', price: 65, image: '/images/queques.png', desc: 'Bolo individual simples e fofo, perfeito para o lanche.' },
                        { name: 'Laços', price: 60, image: '/images/lacos.png', desc: 'Massa folhada açucarada em formato de laço, leve e estaladiça.' },
                        { name: 'Arrofadas', price: 15, image: '/images/arrofadas.png', desc: 'Pão doce tradicional, macio e ligeiramente açucarado.' },
                        { name: 'Língua de Sogra', price: 15, image: '/images/lingua_sogra.png', desc: 'Bolo comprido e macio com creme.' },
                        { name: 'Nevada', price: 80, image: '/images/nevada.png', desc: 'Bolo fofo coberto com creme branco e coco.' },
                        { name: 'Charuto', price: 80, image: '/images/charuto.png', desc: 'Massa enrolada crocante com recheio doce.' },
                        { name: 'Brioche com Fruta', price: 80, image: '/images/brioche_fruta.png', desc: 'Massa brioche enriquecida com frutas cristalizadas.' },
                        { name: 'Pão de Deus', price: 60, image: '/images/pao_deus.png', desc: 'Pão brioche fofo com cobertura crocante de coco.' },
                        { name: 'Rolo de Açúcar e Canela', price: 80, image: '/images/rolo_acucar_canela.png', desc: 'Caracóis de massa doce com o aroma quente da canela.' },
                    ]
                },
                {
                    title: 'Croissants',
                    items: [
                        { name: 'Croissants Folhados', price: 100, image: '/images/croissants_folhados.png', desc: 'Croissant clássico de massa folhada, leve e amanteigado.' },
                        { name: 'Croissants Simples', price: 60, image: '/images/croissants_simples.png', desc: 'Croissant tipo brioche, macio e saboroso.' },
                        { name: 'Croissants Chocolate', price: 80, image: '/images/croissants_chocolate.png', desc: 'Recheado com creme de chocolate rico.' },
                        { name: 'Croissants Recheados', price: 80, image: '/images/croissants_recheados.png', desc: 'Croissant com recheio doce especial.' },
                    ]
                },
                {
                    title: 'Bolos & Sobremesas',
                    items: [
                        { name: 'Torta', price: 150, image: '/images/torta.png', desc: 'Torta caseira fofinha, perfeita para acompanhar o café.' },
                        { name: 'Bolo de Arroz', price: 65, image: '/images/bolo_arroz.png', desc: 'Bolo tradicional feito com farinha de arroz, com textura única.' },
                        { name: 'Cakes / Fatias', price: 150, image: '/images/cakes.png', desc: 'Fatia generosa de bolo caseiro.' },
                        { name: 'Fatias Xadrez', price: 150, image: '/images/fatias_xadrez.png', desc: 'Bolo divertido com padrão axadrezado de dois sabores.' },
                        { name: 'Pudim', price: 600, image: '/images/pudim.png', desc: 'Pudim de ovos caseiro, suave e coberto de caramelo.' },
                    ]
                },
                {
                    title: 'Pizzas',
                    items: [
                        {
                            name: 'Pizza Familiar',
                            price: 700,
                            image: '/images/pizza_mexicana.png',
                            desc: 'Pizza familiar com ingredientes frescos e muito sabor.',
                            variations: [
                                { name: 'Mexicana', price: 700 },
                                { name: 'Frango', price: 700 },
                                { name: 'Atum', price: 700 }
                            ]
                        },
                    ]
                }
            ]
        },
    },
    en: {
        nav: {
            home: 'Home',
            about: 'About',
            services: 'Services',
            classics: 'Classics',
            gallery: 'Gallery',
            contact: 'Contact',
        },
        hero: {
            title: 'Pão Caseiro',
            subtitle: 'The taste that warms the heart.',
            description: 'Smell the bread fresh from the oven — made with time, love, and simple ingredients that remind you of home.',
            order: 'Order Now',
            gallery: 'View Gallery',
            call: 'Call now: +258 846 930 960'
        },
        video: {
            title: 'See how our bread is born',
            subtitle: 'A minute in our kitchen: dough, oven, and hands that care for every batch.',
            play: 'Play Video'
        },
        about: {
            label: 'About Us',
            title: 'A homemade taste that tells stories',
            description: 'Padaria Pão Caseiro offers fresh bread every day, prepared by hand with selected ingredients. Here you find flavor, quality, and service that warms the heart. We are a traditional yet modern bakery with a welcoming atmosphere and products made with love for the whole family. Come taste the true flavor of homemade bread in the city!',
            quote: '"True flavor is made without haste."',
            points: [
                'Artisanal production, no shortcuts.',
                'Selected local ingredients.',
                'Ovens fueled by tradition and care.'
            ]
        },
        services: {
            title: 'Our Services',
            items: [
                { title: 'Bakery', desc: 'Rustic and sweet breads baked daily.' },
                { title: 'Pastry', desc: 'Fresh pastries and savories.' },
                { title: 'Confectionery', desc: 'Personalized cakes and desserts.' },
                { title: 'Café', desc: 'Drinks prepared with love.' }
            ]
        },
        classics: {
            title: 'House classics that warm the heart',
            subtitle: '“Made as if for family.”',
            cta: 'Order Now',
            items: [
                { title: 'Coco Braid', desc: 'Artisanal caramelized puff pastry, finished with fresh grated coconut.' },
                { title: 'Cream Puffs & Eclairs', desc: 'Classics of our confectionery — fluffy dough with cream and eclairs covered in chocolate.' },
                { title: 'Custard Tarts', desc: 'Traditional recipe with thin puff pastry and perfectly golden cream.' },
                { title: 'Mixed Puffs', desc: 'Selection of crispy puff pastries: hearts, triangles, and stars with jam.' }
            ]
        },
        gallery: {
            title: 'Moments and Batches',
            subtitle: 'Images of our oven, counter, and daily creations.',
            zoom: 'Zoom',
            captions: [
                'Our cozy space',
                'Fresh batches every day',
                'Prepared with love',
                'Variety of flavors',
                'Artisanal details',
                'Selected ingredients',
                'Fine pastry',
                'Tradition and flavor',
                'Come visit us',
                'Family atmosphere',
                'The aroma of hot bread',
                'Our specialties'
            ]
        },
        contact: {
            title: 'Order, reserve, talk to us',
            subtitle: 'We will contact you to confirm the order.',
            form: {
                name: 'Name',
                namePlaceholder: 'Your name',
                phone: 'Phone',
                email: 'Email',
                message: 'Message',
                messagePlaceholder: 'What would you like to order or ask?',
                send: 'Send Message',
                success: 'Message sent successfully! We will contact you shortly.',
                error: 'Error sending message. Please try again.'
            },
            visit: {
                title: 'Visit Us',
                desc: 'Stop by, smell the aroma, and make yourself at home. We are waiting — come get hot bread or have a coffee.',
                locationLabel: 'Lichinga',
                location: 'Av. Acordo de Lusaka',
                phoneLabel: 'Call us',
                emailLabel: 'Email',
                emails: ['info@paocaseiro.co.mz', 'suporte@paocaseiro.co.mz']
            }
        },
        footer: {
            description: 'Padaria Pão Caseiro offers fresh bread every day, prepared by hand with selected ingredients. Here you find flavor, quality, and service that warms the heart.',
            quickLinks: 'Quick Links',
            contacts: 'Contacts',
            rights: '© {year} Pão Caseiro. All rights reserved.',
            designed: 'Designed with 🤍 by'
        },
        cart: {
            empty: 'Your cart is empty.',
            total: 'Total',
            subtotal: 'Subtotal',
            estimated_time: 'Estimated Time',
            min_order: 'Minimum order value for delivery'
        },
        checkout: {
            title: 'Checkout',
            details: 'Your Details',
            name: 'Full Name',
            phone: 'Phone',
            address: 'Address (Reference Point)',
            orderType: 'Order Type',
            payment: 'Payment',
            delivery: 'Delivery',
            pickup: 'Pickup',
            dine_in: 'Dine-in',
            continue: 'Continue',
            back: 'Back',
            pay_now: 'Pay Now',
            summary: 'Order Summary',
            items: 'Items'
        },
        menu: {
            add_to_cart: 'Add',
            checkout_btn: 'Checkout',
            title: 'Our Menu',
            subtitle: 'Explore our selection of fresh and artisanal products.',
            order: 'Order Now',
            alert: 'Your cart is empty! Please add items before ordering.',
            sections: [
                {
                    title: 'Pães (Breads)',
                    items: [
                        { name: 'Pão Caseiro', price: 10, image: '/images/pao_caseiro.png', desc: 'Our traditional bread, fresh around the clock.' },
                        { name: 'Pão Português', price: 10, image: '/images/pao_portugues.png', desc: 'Authentic Portuguese recipe with crispy crust and soft crumb.' },
                        { name: 'Pão de Forma Integral', price: 80, image: '/images/pao_forma_integral.png', desc: 'Ideal for balanced and healthy sandwiches.' },
                        { name: 'Pão de Forma Simples', price: 60, image: '/images/pao_forma_simples.png', desc: 'Soft and fluffy, perfect for toast or sandwiches.' },
                        { name: 'Pão Integral', price: 12, image: '/images/pao_integral.png', desc: 'Rich in fiber for a healthier diet.' },
                        { name: 'Broa de Milho', price: 60, image: '/images/broa_milho.png', desc: 'Dense and tasty cornbread.' },
                        { name: 'Pão de Cereais (com sementes)', price: 25, image: '/images/pao_cereais.png', desc: 'Healthy and nutritious bread, rich in selected seeds.' },
                        { name: 'Cachorro Quente Completo', price: 50, image: '/images/cachorro_quente.png', desc: 'Soft bun with sausage and choice of condiments.' },
                    ]
                },
                {
                    title: 'Folhados & Salgados',
                    items: [
                        { name: 'Folhado de Salsicha', price: 70, image: '/images/folhado_salsicha.png', desc: 'Tasty sausage wrapped in golden puff pastry.' },
                        { name: 'Folhado Salsicha com Queijo', price: 70, image: '/images/folhado_salsicha_queijo.png', desc: 'Classic sausage puff pastry with a touch of melted cheese.' },
                        { name: 'Folhados de Carne', price: 100, image: '/images/folhados_carne.png', desc: 'Puff pastry filled with seasoned minced meat.' },
                        { name: 'Folhados Recheados', price: 80, image: '/images/folhados_recheados.png', desc: 'Variety of puff pastries with delicious fillings.' },
                        { name: 'Empadas', price: 100, image: '/images/empadas.png', desc: 'Tender shortcrust pastry with creamy filling.' },
                        { name: 'Rissóis de Camarão', price: 50, image: '/images/rissois_camarao.png', desc: 'Breaded crescent pastry with creamy shrimp filling.' },
                        { name: 'Coxinhas', price: 50, image: '/images/coxinhas.png', desc: 'Traditional savory dough filled with seasoned chicken.' },
                        { name: 'Samosas / Chamussas (50 cada)', price: 50, image: '/images/samosas.png', desc: 'Typical triangular pastry with spiced filling.' },
                        { name: 'Mini Folhados (kg)', price: 1000, image: '/images/mini_folhados.png', desc: 'Assortment of small puff pastries, ideal for parties.' },
                        { name: 'Mini Pizza', price: 50, image: '/images/pizza_mexicana.png', desc: 'Small individual pizza with cheese and tomato sauce.' },
                    ]
                },
                {
                    title: 'Doces & Pastelaria',
                    items: [
                        { name: 'Palmier', price: 50, image: '/images/palmier.png', desc: 'Caramelized puff pastry in a heart shape.' },
                        { name: 'Palmier Recheado', price: 100, image: '/images/palmier_recheado.png', desc: 'Two layers of palmier filled with sweet cream.' },
                        { name: 'Pastel de Nata', price: 80, image: '/images/pastel_nata.png', desc: 'Portuguese classic: puff pastry and creamy egg custard.' },
                        { name: 'Pastel de Coco', price: 80, image: '/images/pastel_coco.png', desc: 'Delicious tartlet with rich coconut filling.' },
                        { name: 'Bola de Berlim', price: 80, image: '/images/bola_berlim.png', desc: 'Fluffy fried dough filled with homemade pastry cream.' },
                        { name: 'Donuts', price: 80, image: '/images/donuts.png', desc: 'Fried doughnut with classic sweet glaze.' },
                        { name: 'Waffle Stick', price: 200, image: '/images/waffle_stick.png', desc: 'Delicious waffle on a stick, crispy outside and soft inside.' },
                        { name: 'Queques', price: 65, image: '/images/queques.png', desc: 'Simple and fluffy individual cake/muffin.' },
                        { name: 'Laços', price: 60, image: '/images/lacos.png', desc: 'Sugared puff pastry in a bow shape, light and crispy.' },
                        { name: 'Arrofadas', price: 15, image: '/images/arrofadas.png', desc: 'Traditional sweet bread, soft and lightly sugared.' },
                        { name: 'Língua de Sogra', price: 15, image: '/images/lingua_sogra.png', desc: 'Long soft cake with cream.' },
                        { name: 'Nevada', price: 80, image: '/images/nevada.png', desc: 'Fluffy cake covered with white cream and coconut.' },
                        { name: 'Charuto', price: 80, image: '/images/charuto.png', desc: 'Rolled crispy pastry with sweet filling.' },
                        { name: 'Brioche com Fruta', price: 80, image: '/images/brioche_fruta.png', desc: 'Brioche dough enriched with candied fruits.' },
                        { name: 'Pão de Deus', price: 60, image: '/images/pao_deus.png', desc: 'Fluffy brioche bun with crispy coconut topping.' },
                        { name: 'Rolo de Açúcar e Canela', price: 80, image: '/images/rolo_acucar_canela.png', desc: 'Sweet dough rolls with the warm aroma of cinnamon.' },
                    ]
                },
                {
                    title: 'Croissants',
                    items: [
                        { name: 'Croissants Folhados', price: 100, image: '/images/croissants_folhados.png', desc: 'Classic puff pastry croissant, light and buttery.' },
                        { name: 'Croissants Simples', price: 60, image: '/images/croissants_simples.png', desc: 'Brioche-style croissant, soft and tasty.' },
                        { name: 'Croissants Chocolate', price: 80, image: '/images/croissants_chocolate.png', desc: 'Filled with rich chocolate cream.' },
                        { name: 'Croissants Recheados', price: 80, image: '/images/croissants_recheados.png', desc: 'Croissant with special sweet filling.' },
                    ]
                },
                {
                    title: 'Bolos & Sobremesas',
                    items: [
                        { name: 'Torta', price: 150, image: '/images/torta.png', desc: 'Fluffy homemade pie/roll, perfect for coffee time.' },
                        { name: 'Bolo de Arroz', price: 65, image: '/images/bolo_arroz.png', desc: 'Traditional rice flour muffin with unique texture.' },
                        { name: 'Cakes / Fatias', price: 150, image: '/images/cakes.png', desc: 'Generous slice of varied homemade cake.' },
                        { name: 'Fatias Xadrez', price: 150, image: '/images/fatias_xadrez.png', desc: 'Fun cake with a checkered pattern of two flavors.' },
                        { name: 'Pudim', price: 600, image: '/images/pudim.png', desc: 'Smooth homemade egg pudding topped with caramel.' },
                    ]
                },
                {
                    title: 'Pizzas',
                    items: [
                        {
                            name: 'Family Pizza',
                            price: 700,
                            image: '/images/pizza_mexicana.png',
                            desc: 'Family pizza with fresh ingredients and lots of flavor.',
                            variations: [
                                { name: 'Mexican', price: 700 },
                                { name: 'Chicken', price: 700 },
                                { name: 'Tuna', price: 700 }
                            ]
                        },
                    ]
                }
            ]
        },
    }
};
