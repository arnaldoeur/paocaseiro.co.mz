
export type Language = 'pt' | 'en';

export const translations = {
    pt: {
        nav: {
            home: 'Início',
            about: 'Sobre',
            services: 'Serviços',
            classics: 'Clássicos',
            blog: 'Blog',
            contact: 'Contacto',
            login: 'Entrar',
            myAccount: 'Minha Conta',
            callUs: 'Ligue para nós',
            openMenu: 'Abrir Menu',
            closeMenu: 'Fechar Menu',

        },
        hero: {
            title: 'Pão Caseiro',
            subtitle: 'O sabor que aquece o coração.',
            description: 'Mais do que pão, entregamos carinho em forma de sabor. Produzido diariamente com ingredientes seleccionados, o nosso pão traz o conforto e a tradição que a sua família merece. Experimente o verdadeiro gosto de casa.',
            order: 'Fazer Encomenda',
            gallery: 'Ver Blog',
            call: 'Fale connosco'
        },
        video: {
            title: 'Veja como sai o nosso pão',
            subtitle: 'Um minuto na nossa cozinha: de folhados irresistíveis a pães rústicos, veja como a magia acontece todos os dias.',
            play: 'Reproduzir com Som'
        },
        about: {
            label: 'Sobre Nós',
            title: 'Um sabor caseiro que conta histórias',
            description: 'A Padaria Pão Caseiro oferece pães fresquinhos todos os dias, preparados com ingredientes selecionados. Aqui você encontra sabor, qualidade e um atendimento que aquece o coração. Somos uma padaria tradicional, Moderna com ambiente acolhedor e produtos feitos com carinho para toda a família. Venha provar o verdadeiro sabor do pão caseiro na cidade!',
            quote: '"O verdadeiro sabor é feito sem pressa."',
            points: [
                'Produção cuidada, sem atalhos.',
                'Ingredientes locais selecionados.',
                'Fornos movidos pela tradição e pelo cuidado.'
            ]
        },
        services: {
            title: 'Nossos Serviços',
            description: 'Conheça a nossa variedade de serviços pensados para tornar o seu dia mais saboroso e especial.',
            items: [
                { title: 'Padaria e Pastelaria', desc: 'Pães rústicos, bolos tradicionais e salgados frescos, feitos com dedicação diária.' },
                { title: 'Confeitaria', desc: 'Doces finos, tortas artesanais e sobremesas personalizadas para momentos especiais.' },
                { title: 'Café', desc: 'Bebidas quentes e frias, preparadas com grãos selecionados para um aroma incomparável.' },
                { title: 'Lanches e Takeaway', desc: 'Opções práticas e deliciosas para quem não abre mão da qualidade no dia a dia.' }
            ]
        },
        classics: {
            title: 'Clássicos da casa que aquecem o coração',
            subtitle: '“Feito como se fosse para a família.”',
            cta: 'Encomendar Agora',
            items: [
                { title: 'Pastéis de Nata', desc: 'A clássica doçura portuguesa, estaladiços por fora e cremosos por dentro.' },
                { title: 'Pão de Cereais', desc: 'Uma opção saudável, rica em fibra e com um sabor inconfundível.' },
                { title: 'Pão Integral', desc: 'O nosso pão integral clássico, fresco a toda a hora.' },
                { title: 'Pão Caseiro', desc: 'Aquele pão rústico especial que toda a família adora.' },
                { title: 'Croissants', desc: 'Folhados, recheados ou simples, sempre com a máxima qualidade.' },
                { title: 'Broa de Milho', desc: 'Broa densa e saborosa, feita com a melhor farinha de milho.' }
            ]
        },
        gallery: {
            title: 'A nossa montra aberta para si',
            subtitle: 'Conheça de perto as nossas especialidades através da objetiva de quem nos visita todos os dias.',
            zoom: 'Ver Imagem'
        },
        blog: {
            title: 'Notícias',
            subtitle: 'Novidades e histórias da nossa padaria.',
            readMore: 'Ler mais',
            author: 'Por',
            publishedAt: 'Publicado em',
            share: 'Partilhar',
            backToBlog: 'Voltar ao Blog',
            categories: 'Categorias',
            tags: 'Tags',
            empty: 'Ainda não existem artigos publicados.',
            presentation: {
                title: 'À Descoberta da Pão Caseiro',
                desc: 'Acompanhe o nosso dia a dia, desde as madrugadas quentes à beira do forno até aos sorrisos na entrega do pão fresco. Somos mais do que uma padaria, somos parte da sua família.',
                location: 'Encontre-nos'
            },
            comments: {
                title: 'Comentários',
                empty: 'Ainda não há comentários. Seja o primeiro a comentar!',
                formTitle: 'Deixe um comentário',
                namePlaceholder: 'O seu nome (obrigatório)',
                commentPlaceholder: 'O seu comentário...',
                submit: 'Comentar',
                submitting: 'A enviar...',
                success: 'Comentário enviado!',
                error: 'Erro ao enviar comentário. Tente novamente.'
            }
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
                location: 'Av. acordo Lusaka Lichinga Niassa, 3300, Moçambique',
                phoneLabel: 'Ligue para nós',
                emailLabel: 'Email',
                emails: ['geral@paocaseiro.co.mz', 'suporte@paocaseiro.co.mz']
            }
        },
        footer: {
            description: 'A Padaria Pão Caseiro oferece pães fresquinhos todos os dias, preparados de forma artesanal com ingredientes selecionados. Aqui você encontra sabor, qualidade e um atendimento que aquece o coração.',
            quickLinks: 'Links Rápidos',
            contacts: 'Contactos',
            rights: '© {year} Pão Caseiro. Todos os direitos reservados.',
            designed: 'Desenhado com 🤍 pela'
        },
        clientDashboard: {
            myAccount: 'A Minha Conta',
            phone: 'Telemóvel',
            editProfile: 'Editar Perfil',
            logout: 'Terminar Sessão',
            fullName: 'Nome Completo',
            email: 'Email',
            dob: 'Data de Nascimento',
            addressTitle: 'Bairro (Morada Geral)',
            street: 'Rua',
            reference: 'Ponto de Referência',
            whatsapp: 'WhatsApp',
            cancel: 'Cancelar',
            save: 'Gravar Alterações',
            saving: 'A Gravar...',
            chooseAvatar: 'Escolher Avatar',
            orderHistory: 'Histórico de Pedidos',
            noOrders: 'Sem pedidos anteriores',
            noOrdersDesc: 'Quando fizer a sua primeira encomenda, ela aparecerá aqui.',
            exploreMenu: 'Explorar Menu',
            order: 'Pedido',
            items: 'Itens',
            reorder: 'Pedir Novamente',
            support: 'Suporte',
            directSupport: 'Suporte Direto',
            supportDesc: 'Tem alguma questão sobre a sua encomenda? Precisa de ajuda? Fale com a equipa de suporte aqui.',
            supportSuccess: 'Mensagem enviada com sucesso! Responderemos o mais breve possível.',
            supportError: 'Erro ao enviar. Tente novamente ou use o nosso WhatsApp.',
            supportPlaceholder: 'Escreva a sua mensagem detalhada aqui...',
            supportSending: 'A Enviar...',
            supportSend: 'Enviar Mensagem',
            delivery: 'Entrega',
            pickup: 'Levantamento',
            dineIn: 'Mesa',
            status: {
                completed: 'Concluído',
                delivered: 'Entregue',
                cancelled: 'Cancelado',
                pending: 'Pendente'
            }
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
            order: 'Pedir',
            sections: [
                {
                    title: 'Folhados e Doces',
                    items: [
                        { name: 'Palmier', price: 50, image: '/images/palmier.png' },
                        { name: 'Palmier recheado', price: 100, image: '/images/palmier_recheado.png' },
                        { name: 'Folhados recheados', price: 80, image: '/images/folhados_recheados.png' },
                        { name: 'Pastel de Nata', price: 80, image: '/images/pastel_nata.png' },
                        { name: 'Pastel de coco', price: 80, image: '/images/pastel_coco.png' },
                        { name: 'Folhado de salsicha', price: 70, image: '/images/folhado_salsicha.png' },
                        { name: 'Croissants folhados', price: 80, image: '/images/croissants_folhados.png' },
                        { name: 'Empadas recheadas', price: 100, image: '/images/empadas.png' },
                        { name: 'Mini folhados (kg)', price: 1000, image: '/images/mini_folhados.png' },
                    ]
                },
                {
                    title: 'Brioches',
                    items: [
                        { name: 'Brioche recheado', price: 80, image: '/images/brioche_fruta.png' },
                        { name: 'Donuts', price: 80, image: '/images/donuts.png' },
                        { name: 'Bola de Berlim', price: 80, image: '/images/bola_berlim.png' },
                        { name: 'Nevada', price: 80, image: '/images/nevada.png' },
                        { name: 'Croissants simples', price: 60, image: '/images/croissants_simples.png' },
                        { name: 'Croissant recheado', price: 80, image: '/images/croissants_recheados.png' },
                        { name: 'Charuto', price: 80, image: '/images/charuto.png' },
                        { name: 'Croissants chocolate', price: 80, image: '/images/croissants_chocolate.png' },
                        { name: 'Rolo de açúcar e canela', price: 80, image: '/images/rolo_acucar_canela.png' },
                        { name: 'Pão de Deus', price: 60, image: '/images/pao_deus.png' },
                        { name: 'Laços', price: 60, image: '/images/lacos.png' },
                        { name: 'Arrofadas', price: 15, image: '/images/arrofadas.png' },
                        { name: 'Língua de Sogra', price: 15, image: '/images/lingua_sogra.png' },
                        { name: 'Biscoitos (kg)', price: 1200, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Waffle',
                    items: [
                        { name: 'Waffle Stick', price: 200, image: '/images/waffle_stick.png' },
                    ]
                },
                {
                    title: 'Pizzas Grandes',
                    items: [
                        { name: 'Frango', price: 700, image: '/paocaseiropng.png' },
                        { name: 'Atum', price: 700, image: '/paocaseiropng.png' },
                        { name: 'Margarita', price: 700, image: '/paocaseiropng.png' },
                        { name: 'Palony/Pepperoni', price: 700, image: '/paocaseiropng.png' },
                        { name: '4 Estações', price: 800, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Pizzas Médias',
                    items: [
                        { name: 'Frango', price: 600, image: '/paocaseiropng.png' },
                        { name: 'Atum', price: 600, image: '/paocaseiropng.png' },
                        { name: 'Margarita', price: 600, image: '/paocaseiropng.png' },
                        { name: 'Palony/Pepperoni', price: 600, image: '/paocaseiropng.png' },
                        { name: '4 Estações', price: 700, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Fatias e Bolos',
                    items: [
                        { name: 'Queque', price: 65, image: '/images/queques.png' },
                        { name: 'Bolo de arroz', price: 65, image: '/images/bolo_arroz.png' },
                        { name: 'Torta', price: 85, image: '/images/torta.png' },
                        { name: 'Fatia xadrez', price: 150, image: '/images/fatias_xadrez.png' },
                        { name: 'Fatia folhado de canela', price: 150, image: '/paocaseiropng.png' },
                        { name: 'Fatias mix', price: 150, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Bolos Inteiros/Encomenda',
                    items: [
                        { name: 'Bolo de Cenoura c/ Chocolate', price: 1200, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Bolo de Laranja', price: 1000, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Bolo de Chocolate Húmido', price: 1500, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Bolo Red Velvet', price: 1800, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Cheesecake (Morango/Maracujá)', price: 1600, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Tarte de Amêndoa', price: 1400, image: '/paocaseiropng.png', isSpecial: true },
                    ]
                },
                {
                    title: 'Salgados',
                    items: [
                        { name: 'Rissóis de camarão', price: 50, image: '/images/rissois_camarao.png' },
                        { name: 'Samosa carne/peixe/frango/queijo', price: 50, image: '/images/samosas.png' },
                        { name: 'Samosa vegetais', price: 35, image: '/paocaseiropng.png' },
                        { name: 'Coxinhas', price: 50, image: '/images/coxinhas.png' },
                        { name: 'Mini pizza', price: 50, image: '/paocaseiropng.png' },
                        { name: 'Croquete', price: 50, image: '/paocaseiropng.png' },
                        { name: 'Folhados pies de batata', price: 80, image: '/paocaseiropng.png' },
                        { name: 'Folhados de frango', price: 100, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Pães',
                    items: [
                        { name: 'Pão de forma (grande)', price: 60, image: '/images/pao_forma_simples.png' },
                        { name: 'Pão de forma (pequeno)', price: 30, image: '/images/pao_forma_simples.png' },
                        { name: 'Pão caseiro', price: 10, image: '/images/pao_caseiro.png' },
                        { name: 'Pão integral', price: 12, image: '/images/pao_integral.png' },
                        { name: 'Pão cassete integral', price: 15, image: '/images/pao_forma_integral.png' },
                        { name: 'Pão hamburguer/cachorro', price: 15, image: '/images/cachorro_quente.png' },
                        { name: 'Pão de centeio', price: 35, image: '/paocaseiropng.png' },
                        { name: 'Pão de cereais', price: 40, image: '/images/pao_cereais.png' },
                        { name: 'Pão forma integral grande', price: 80, image: '/images/pao_forma_integral.png' },
                        { name: 'Pão forma integral pequeno', price: 40, image: '/images/pao_forma_integral.png' },
                        { name: 'Pão de água', price: 8, image: '/images/pao_caseiro.png' },
                        { name: 'Pão d’água', price: 5, image: '/paocaseiropng.png' },
                        { name: 'Broa de milho', price: 60, image: '/images/broa_milho.png' },
                        { name: 'Torradas', price: 20, image: '/paocaseiropng.png' },
                        { name: 'Baguete francês', price: 70, image: '/paocaseiropng.png' },
                        { name: 'Cassete', price: 16, image: '/paocaseiropng.png' },
                    ]
                },
            ]
        },
    },
    en: {
        nav: {
            home: 'Home',
            about: 'About',
            services: 'Services',
            classics: 'Classics',
            blog: 'Blog',
            contact: 'Contact',
            login: 'Login',
            myAccount: 'My Account',
            callUs: 'Call us',
            openMenu: 'Open Menu',
            closeMenu: 'Close Menu',
        },
        hero: {
            title: 'Pão Caseiro',
            subtitle: 'The taste that warms the heart.',
            description: 'More than bread, we deliver affection in the form of flavor. Produced daily with selected ingredients, our bread brings the comfort and tradition your family deserves. Experience the true taste of home.',
            order: 'Order Now',
            gallery: 'View Blog',
            call: 'Talk to us'
        },
        video: {
            title: 'The Most Homemade Bread in Maputo?',
            subtitle: 'One minute in our kitchen: from irresistible puff pastries to rustic breads, see how the magic happens every day.',
            play: 'Play with Sound'
        },
        about: {
            label: 'About Us',
            title: 'A homemade taste that tells stories',
            description: 'Padaria Pão Caseiro offers fresh bread every day, prepared by hand with selected ingredients. Here you find flavor, quality, and service that warms the heart. We are a traditional yet modern bakery with a welcoming atmosphere and products made with love for the whole family. Come taste the true flavor of homemade bread in the city!',
            quote: '"True flavor is made without haste."',
            points: [
                'Carefully produced, no shortcuts.',
                'Selected local ingredients.',
                'Ovens fueled by tradition and care.'
            ]
        },
        services: {
            title: 'Our Services',
            description: 'Discover our variety of services designed to make your day tastier and more special.',
            items: [
                { title: 'Bakery & Pastry', desc: 'Artisanal breads, traditional cakes, and fresh savories baked daily with dedication.' },
                { title: 'Confectionery', desc: 'Fine sweets, handmade tarts, and personalized desserts for special moments.' },
                { title: 'Café', desc: 'Hot and cold beverages, prepared with selected beans for an incomparable aroma.' },
                { title: 'Snacks & Takeaway', desc: 'Practical and delicious options for those who don\'t compromise on quality in their daily lives.' }
            ]
        },
        classics: {
            title: 'House classics that warm the heart',
            subtitle: '“Made as if for family.”',
            cta: 'Order Now',
            items: [
                { title: 'Custard Tarts', desc: 'The classic Portuguese sweetness, crispy on the outside and creamy on the inside.' },
                { title: 'Cereal Bread', desc: 'A healthy option, rich in fiber and with an unmistakable flavor.' },
                { title: 'Whole Wheat Bread', desc: 'Our classic whole wheat bread, fresh at all times.' },
                { title: 'Homemade Bread', desc: 'That special rustic bread that the whole family loves.' },
                { title: 'Croissants', desc: 'Puff pastry, filled or plain, always with the highest quality.' },
                { title: 'Corn Bread', desc: 'Dense and tasty bread, made with the best corn flour.' }
            ]
        },
        gallery: {
            title: 'Our showcase open for you',
            subtitle: 'Get a closer look at our specialties through the lens of our daily visitors.',
            zoom: 'View Image'
        },
        blog: {
            title: 'News',
            subtitle: 'News and stories from our bakery.',
            readMore: 'Read more',
            author: 'By',
            publishedAt: 'Published on',
            share: 'Share',
            backToBlog: 'Back to Blog',
            categories: 'Categories',
            tags: 'Tags',
            empty: 'No articles published yet.',
            presentation: {
                title: 'Discovering Pão Caseiro',
                desc: 'Follow our daily routine, from warm early mornings by the oven to the smiles when delivering fresh bread. We are more than a bakery; we are part of your family.',
                location: 'Find us'
            },
            comments: {
                title: 'Comments',
                empty: 'No comments yet. Be the first to comment!',
                formTitle: 'Leave a comment',
                namePlaceholder: 'Your name (required)',
                commentPlaceholder: 'Your comment...',
                submit: 'Post Comment',
                submitting: 'Posting...',
                success: 'Comment posted!',
                error: 'Error posting comment. Try again.'
            }
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
                location: 'Av. acordo Lusaka Lichinga Niassa, 3300, Moçambique',
                phoneLabel: 'Call us',
                emailLabel: 'Email',
                emails: ['geral@paocaseiro.co.mz', 'suporte@paocaseiro.co.mz']
            }
        },
        footer: {
            description: 'Padaria Pão Caseiro offers fresh bread every day, prepared by hand with selected ingredients. Here you find flavor, quality, and service that warms the heart.',
            quickLinks: 'Quick Links',
            contacts: 'Contacts',
            rights: '© {year} Pão Caseiro. All rights reserved.',
            designed: 'Designed with 🤍 by'
        },
        clientDashboard: {
            myAccount: 'My Account',
            phone: 'Phone',
            editProfile: 'Edit Profile',
            logout: 'Logout',
            fullName: 'Full Name',
            email: 'Email',
            dob: 'Date of Birth',
            addressTitle: 'Neighborhood (General Address)',
            street: 'Street',
            reference: 'Reference Point',
            whatsapp: 'WhatsApp',
            cancel: 'Cancel',
            save: 'Save Changes',
            saving: 'Saving...',
            chooseAvatar: 'Choose Avatar',
            orderHistory: 'Order History',
            noOrders: 'No previous orders',
            noOrdersDesc: 'When you place your first order, it will appear here.',
            exploreMenu: 'Explore Menu',
            order: 'Order',
            items: 'Items',
            reorder: 'Order Again',
            support: 'Support',
            directSupport: 'Direct Support',
            supportDesc: 'Have a question about your order? Need help? Talk to the support team here.',
            supportSuccess: 'Message sent successfully! We will respond as soon as possible.',
            supportError: 'Error sending. Try again or use our WhatsApp.',
            supportPlaceholder: 'Write your detailed message here...',
            supportSending: 'Sending...',
            supportSend: 'Send Message',
            delivery: 'Delivery',
            pickup: 'Pickup',
            dineIn: 'Dine-in',
            status: {
                completed: 'Completed',
                delivered: 'Delivered',
                cancelled: 'Cancelled',
                pending: 'Pending'
            }
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
                    title: 'Folhados e Doces',
                    items: [
                        { name: 'Palmier', price: 50, image: '/images/palmier.png' },
                        { name: 'Palmier recheado', price: 100, image: '/images/palmier_recheado.png' },
                        { name: 'Folhados recheados', price: 80, image: '/images/folhados_recheados.png' },
                        { name: 'Pastel de Nata', price: 80, image: '/images/pastel_nata.png' },
                        { name: 'Pastel de coco', price: 80, image: '/images/pastel_coco.png' },
                        { name: 'Folhado de salsicha', price: 70, image: '/images/folhado_salsicha.png' },
                        { name: 'Croissants folhados', price: 80, image: '/images/croissants_folhados.png' },
                        { name: 'Empadas recheadas', price: 100, image: '/images/empadas.png' },
                        { name: 'Mini folhados (kg)', price: 1000, image: '/images/mini_folhados.png' },
                    ]
                },
                {
                    title: 'Brioches',
                    items: [
                        { name: 'Brioche recheado', price: 80, image: '/images/brioche_fruta.png' },
                        { name: 'Donuts', price: 80, image: '/images/donuts.png' },
                        { name: 'Bola de Berlim', price: 80, image: '/images/bola_berlim.png' },
                        { name: 'Nevada', price: 80, image: '/images/nevada.png' },
                        { name: 'Croissants simples', price: 60, image: '/images/croissants_simples.png' },
                        { name: 'Croissant recheado', price: 80, image: '/images/croissants_recheados.png' },
                        { name: 'Charuto', price: 80, image: '/images/charuto.png' },
                        { name: 'Croissants chocolate', price: 80, image: '/images/croissants_chocolate.png' },
                        { name: 'Rolo de açúcar e canela', price: 80, image: '/images/rolo_acucar_canela.png' },
                        { name: 'Pão de Deus', price: 60, image: '/images/pao_deus.png' },
                        { name: 'Laços', price: 60, image: '/images/lacos.png' },
                        { name: 'Arrofadas', price: 15, image: '/images/arrofadas.png' },
                        { name: 'Língua de Sogra', price: 15, image: '/images/lingua_sogra.png' },
                        { name: 'Biscoitos (kg)', price: 1200, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Waffle',
                    items: [
                        { name: 'Waffle Stick', price: 200, image: '/images/waffle_stick.png' },
                    ]
                },
                {
                    title: 'Pizzas Grandes',
                    items: [
                        { name: 'Frango', price: 700, image: '/paocaseiropng.png' },
                        { name: 'Atum', price: 700, image: '/paocaseiropng.png' },
                        { name: 'Margarita', price: 700, image: '/paocaseiropng.png' },
                        { name: 'Palony/Pepperoni', price: 700, image: '/paocaseiropng.png' },
                        { name: '4 Estações', price: 800, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Pizzas Médias',
                    items: [
                        { name: 'Frango', price: 600, image: '/paocaseiropng.png' },
                        { name: 'Atum', price: 600, image: '/paocaseiropng.png' },
                        { name: 'Margarita', price: 600, image: '/paocaseiropng.png' },
                        { name: 'Palony/Pepperoni', price: 600, image: '/paocaseiropng.png' },
                        { name: '4 Estações', price: 700, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Fatias e Bolos',
                    items: [
                        { name: 'Queque', price: 65, image: '/images/queques.png' },
                        { name: 'Bolo de arroz', price: 65, image: '/images/bolo_arroz.png' },
                        { name: 'Torta', price: 85, image: '/images/torta.png' },
                        { name: 'Fatia xadrez', price: 150, image: '/images/fatias_xadrez.png' },
                        { name: 'Fatia folhado de canela', price: 150, image: '/paocaseiropng.png' },
                        { name: 'Fatias mix', price: 150, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Bolos Inteiros/Encomenda',
                    items: [
                        { name: 'Bolo de Cenoura c/ Chocolate', price: 1200, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Bolo de Laranja', price: 1000, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Bolo de Chocolate Húmido', price: 1500, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Bolo Red Velvet', price: 1800, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Cheesecake (Morango/Maracujá)', price: 1600, image: '/paocaseiropng.png', isSpecial: true },
                        { name: 'Tarte de Amêndoa', price: 1400, image: '/paocaseiropng.png', isSpecial: true },
                    ]
                },
                {
                    title: 'Salgados',
                    items: [
                        { name: 'Rissóis de camarão', price: 50, image: '/images/rissois_camarao.png' },
                        { name: 'Samosa carne/peixe/frango/queijo', price: 50, image: '/images/samosas.png' },
                        { name: 'Samosa vegetais', price: 35, image: '/paocaseiropng.png' },
                        { name: 'Coxinhas', price: 50, image: '/images/coxinhas.png' },
                        { name: 'Mini pizza', price: 50, image: '/paocaseiropng.png' },
                        { name: 'Croquete', price: 50, image: '/paocaseiropng.png' },
                        { name: 'Folhados pies de batata', price: 80, image: '/paocaseiropng.png' },
                        { name: 'Folhados de frango', price: 100, image: '/paocaseiropng.png' },
                    ]
                },
                {
                    title: 'Pães',
                    items: [
                        { name: 'Pão de forma (grande)', price: 60, image: '/images/pao_forma_simples.png' },
                        { name: 'Pão de forma (pequeno)', price: 30, image: '/images/pao_forma_simples.png' },
                        { name: 'Pão caseiro', price: 10, image: '/images/pao_caseiro.png' },
                        { name: 'Pão integral', price: 12, image: '/images/pao_integral.png' },
                        { name: 'Pão cassete integral', price: 15, image: '/images/pao_forma_integral.png' },
                        { name: 'Pão hamburguer/cachorro', price: 15, image: '/images/cachorro_quente.png' },
                        { name: 'Pão de centeio', price: 35, image: '/paocaseiropng.png' },
                        { name: 'Pão de cereais', price: 40, image: '/images/pao_cereais.png' },
                        { name: 'Pão forma integral grande', price: 80, image: '/images/pao_forma_integral.png' },
                        { name: 'Pão forma integral pequeno', price: 40, image: '/images/pao_forma_integral.png' },
                        { name: 'Pão de água', price: 8, image: '/images/pao_caseiro.png' },
                        { name: 'Pão d’água', price: 5, image: '/paocaseiropng.png' },
                        { name: 'Broa de milho', price: 60, image: '/images/broa_milho.png' },
                        { name: 'Torradas', price: 20, image: '/paocaseiropng.png' },
                        { name: 'Baguete francês', price: 70, image: '/paocaseiropng.png' },
                        { name: 'Cassete', price: 16, image: '/paocaseiropng.png' },
                    ]
                },
            ]
        },
    }
};
