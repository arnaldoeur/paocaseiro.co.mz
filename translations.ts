
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
                { title: 'Pão', desc: 'O nosso pão tradicional, fresco a toda a hora.' },
                { title: 'Pão Caseiro', desc: 'Aquele pão especial que é encomendado geralmente.' },
                { title: 'Croissants', desc: 'Folhados, recheados ou simples, sempre frescos.' },
                { title: 'Broa de Milho', desc: 'Broa densa e saborosa, feita com farinha de milho.' }
            ]
        },
        gallery: {
            title: 'A nossa montra aberta para si',
            subtitle: 'Conheça de perto as nossas especialidades através da objetiva de quem nos visita todos os dias.',
            zoom: 'Ver Imagem'
        },
        blog: {
            title: 'Nosso Blog',
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
                    title: 'Pizzaria',
                    items: [
                        { name: 'Pizza mexicana', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza de frango', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza de peperoni', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza 4 estacões', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza de palony', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Mini pizza diversos un', price: 50, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                    ]
                },
                {
                    title: 'Lanches',
                    items: [
                        { name: 'Cachorro quente completo', price: 300, image: '/images/cachorro_quente.png', desc: 'Pão macio com salsicha e condimentos à escolha.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Hambúrguer completo', price: 350, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Shawarma de galinha', price: 300, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Shawarma de carne', price: 350, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Cachorro quente', price: 250, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Hambúrguer simples', price: 300, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                    ]
                },
                {
                    title: 'Cafés',
                    items: [
                        { name: 'Cappuccino', price: 200, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Hot chocolate', price: 200, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café pingado', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café especial', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café gelado', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café espresso', price: 100, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Chás',
                    items: [
                        { name: 'Chá simples', price: 70, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Chá de leite', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Chá especial', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Bolos & Sobremesas',
                    items: [
                        { name: 'Cupcake normal', price: 65, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Cakes / fatias', price: 150, image: '/images/cakes.png', desc: 'Fatia generosa de bolo caseiro.' },
                        { name: 'Fatias xadrez', price: 150, image: '/images/fatias_xadrez.png', desc: 'Bolo divertido com padrão axadrezado de dois sabores.' },
                        { name: 'Pastel de nata', price: 80, image: '/images/pastel_nata.png', desc: 'O ex-líbris da doçaria portuguesa: massa folhada e creme de ovos cremoso.' },
                        { name: 'Bolo de arroz', price: 65, image: '/images/bolo_arroz.png', desc: 'Bolo tradicional feito com farinha de arroz, com textura única.' },
                        { name: 'Donuts', price: 80, image: '/images/donuts.png', desc: 'Rosquinha frita com cobertura doce clássica.' },
                        { name: 'Charruto recheado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pudim', price: 600, image: '/images/pudim.png', desc: 'Pudim de ovos caseiro, suave e coberto de caramelo.' },
                        { name: 'Queques', price: 65, image: '/images/queques.png', desc: 'Bolo individual simples e fofo, perfeito para o lanche.' },
                        { name: 'Palmier recheado', price: 100, image: '/images/palmier_recheado.png', desc: 'Duas camadas de palmier recheadas com creme doce.' },
                        { name: 'Torta', price: 150, image: '/images/torta.png', desc: 'Torta caseira fofinha, perfeita para acompanhar o café.' },
                        { name: 'Waffle stick', price: 0, image: '/images/waffle_stick.png', desc: 'Delicioso waffle no palito, crocante por fora e macio por dentro.' },
                        { name: 'Folhado recheado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Beijinhos de coco', price: 120, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Biscoitos amanteigados', price: 120, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Caracol de canela', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Croisant recheado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bolo t26', price: 2500, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bolo t22', price: 1850, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pasteis de coco', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Guardanapo recheado c/ creme', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Brioche de frutas', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Broche rechado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bolo t14', price: 750, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Mini folhados grama', price: 1.2, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Nevada', price: 80, image: '/images/nevada.png', desc: 'Bolo fofo coberto com creme branco e coco.' },
                        { name: 'Bolo t18', price: 1350, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Croisant simples', price: 60, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bola de berlim', price: 80, image: '/images/bola_berlim.png', desc: 'Massa frita fofa, recheada com o nosso creme pasteleiro caseiro.' },
                        { name: 'Fatias normal', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Palmier simples', price: 50, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Folhados & Salgados',
                    items: [
                        { name: 'Folhado de salsicha', price: 70, image: '/images/folhado_salsicha.png', desc: 'Salsicha saborosa envolta em massa folhada dourada.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Mini pizza', price: 50, image: '/images/pizza_mexicana.png', desc: 'Pequena pizza individual com queijo e molho de tomate.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Samosas / chamussas (50 cada)', price: 50, image: '/images/samosas.png', desc: 'Pastel triangular típico, com recheio condimentado.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Rissóis de camarão', price: 50, image: '/images/rissois_camarao.png', desc: 'Meia-lua panada com recheio cremoso de camarão.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Almofadinha', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Calzone', price: 80, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de frango', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de vegetais', price: 40, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Empadas', price: 100, image: '/images/empadas.png', desc: 'Massa quebrada tenra com recheio cremoso.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Empada de carne', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhados de carne', price: 100, image: '/images/folhados_carne.png', desc: 'Recheio de carne picada bem temperada em massa folhada.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants simples', price: 60, image: '/images/croissants_simples.png', desc: 'Croissant tipo brioche, macio e saboroso.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants chocolate', price: 80, image: '/images/croissants_chocolate.png', desc: 'Recheado com creme de chocolate rico.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Coxinhas', price: 50, image: '/images/coxinhas.png', desc: 'Salgado tradicional com recheio cremoso e massa crocante.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Empadas de frango', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Rissois', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'King pie frango/carne', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Mini subs', price: 60, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhado salsicha com queijo', price: 70, image: '/images/folhado_salsicha_queijo.png', desc: 'O clássico folhado de salsicha com um toque de queijo derretido.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhados recheados', price: 80, image: '/images/folhados_recheados.png', desc: 'Variedade de folhados com recheios deliciosos.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Mini folhados (kg)', price: 1000, image: '/images/mini_folhados.png', desc: 'Sortido de pequenos folhados, ideais para festas e snacks.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhados de salchicha', price: 70, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants recheados', price: 80, image: '/images/croissants_recheados.png', desc: 'Croissant com recheio doce especial.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Pie de vegetais', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de peixe', price: 40, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants folhados', price: 100, image: '/images/croissants_folhados.png', desc: 'Croissant clássico de massa folhada, leve e amanteigado.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de carne', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                    ]
                },
                {
                    title: 'Pães',
                    items: [
                        { name: 'Pao normal 50g', price: 5, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao portugues', price: 20, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão de cereais (com sementes)', price: 25, image: '/images/pao_cereais.png', desc: 'Pão saudável e nutritivo, rico em sementes selecionadas.' },
                        { name: 'Mini pao de forma 250g', price: 30, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Lingua da sogra 80g', price: 15, image: '/images/pao_caseiro.png', desc: '' },

                        { name: 'Manteiguinha clover 7g', price: 20, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Arrofadas 80g', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão integral', price: 12, image: '/images/pao_integral.png', desc: 'Rico em fibras, para uma alimentação mais saudável.' },
                        { name: 'Baguete frances', price: 70, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão de forma integral', price: 80, image: '/images/pao_forma_integral.png', desc: 'Ideal para sandes equilibradas e saudáveis.' },
                        { name: 'Mini pao de forma intergral 250g', price: 40, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão caseiro', price: 10, image: '/images/pao_caseiro.png', desc: 'O nosso pão tradicional, fresco a toda a hora.' },
                        { name: 'Pao de deus', price: 60, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão português', price: 10, image: '/images/pao_portugues.png', desc: 'Receita portuguesa autêntica, com côdea estaladiça e miolo fofo.' },
                        { name: 'Pao de forma 500g', price: 60, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de forma cereais', price: 50, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de forma integral 500g', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao caserio 100g', price: 10, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de centeio', price: 35, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao caseiro grande', price: 40, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de humbuger/ cachoro', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao integral peq', price: 10, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Paozinho de leite 100g', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de cereais c/ sementes', price: 40, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão de forma simples', price: 60, image: '/images/pao_forma_simples.png', desc: 'Fofo e macio, perfeito para torradas ou sandes.' },
                        { name: 'Broa de milho', price: 20, image: '/images/broa_milho.png', desc: 'Broa densa e saborosa, feita com farinha de milho.' },
                        { name: 'Pao de agua', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao normal 80g', price: 8, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao cassete', price: 16, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao crocodilo', price: 30, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Saco de torrada', price: 20, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Doces & Pastelaria',
                    items: [
                        { name: 'Palmier', price: 50, image: '/images/palmier.png', desc: 'Massa folhada caramelizada em formato de coração.' },
                        { name: 'Língua de sogra', price: 15, image: '/images/lingua_sogra.png', desc: 'Bolo comprido e macio com creme.' },
                        { name: 'Arrofadas', price: 15, image: '/images/arrofadas.png', desc: 'Pão doce tradicional, macio e ligeiramente açucarado.' },
                        { name: 'Charuto', price: 80, image: '/images/charuto.png', desc: 'Massa enrolada crocante com recheio doce.' },
                        { name: 'Laços', price: 60, image: '/images/lacos.png', desc: 'Massa folhada açucarada em formato de laço, leve e estaladiça.' },
                        { name: 'Rolo de açúcar e canela', price: 80, image: '/images/rolo_acucar_canela.png', desc: 'Caracóis de massa doce com o aroma quente da canela.' },
                        { name: 'Pão de deus', price: 60, image: '/images/pao_deus.png', desc: 'Pão brioche fofo com cobertura crocante de coco.' },
                        { name: 'Brioche com fruta', price: 80, image: '/images/brioche_fruta.png', desc: 'Massa brioche enriquecida com frutas cristalizadas.' },
                        { name: 'Pastel de coco', price: 80, image: '/images/pastel_coco.png', desc: 'Tartelete deliciosa com recheio rico de coco.' },
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
                { title: 'Coco Braid', desc: 'Artisanal caramelized puff pastry, finished with fresh grated coconut.' },
                { title: 'Cream Puffs & Eclairs', desc: 'Classics of our confectionery — fluffy dough with cream and eclairs covered in chocolate.' },
                { title: 'Custard Tarts', desc: 'Traditional recipe with thin puff pastry and perfectly golden cream.' },
                { title: 'Mixed Puffs', desc: 'Selection of crispy puff pastries: hearts, triangles, and stars with jam.' }
            ]
        },
        gallery: {
            title: 'Our showcase open for you',
            subtitle: 'Get a closer look at our specialties through the lens of our daily visitors.',
            zoom: 'View Image'
        },
        blog: {
            title: 'Our Blog',
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
                    title: 'Pizzaria',
                    items: [
                        { name: 'Pizza mexicana', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza de frango', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza de peperoni', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza 4 estacões', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Pizza de palony', price: 700, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                        { name: 'Mini pizza diversos un', price: 50, image: '/images/pao_caseiro.png', desc: '', variations: [{ name: "Média", price: 0 }, { name: "Grande", price: 250 }] },
                    ]
                },
                {
                    title: 'Lanches',
                    items: [
                        { name: 'Cachorro quente completo', price: 300, image: '/images/cachorro_quente.png', desc: 'Pão macio com salsicha e condimentos à escolha.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Hambúrguer completo', price: 350, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Shawarma de galinha', price: 300, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Shawarma de carne', price: 350, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Cachorro quente', price: 250, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Hambúrguer simples', price: 300, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                    ]
                },
                {
                    title: 'Cafés',
                    items: [
                        { name: 'Cappuccino', price: 200, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Hot chocolate', price: 200, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café pingado', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café especial', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café gelado', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Café espresso', price: 100, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Chás',
                    items: [
                        { name: 'Chá simples', price: 70, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Chá de leite', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Chá especial', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Bolos & Sobremesas',
                    items: [
                        { name: 'Cupcake normal', price: 65, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Cakes / fatias', price: 150, image: '/images/cakes.png', desc: 'Fatia generosa de bolo caseiro.' },
                        { name: 'Fatias xadrez', price: 150, image: '/images/fatias_xadrez.png', desc: 'Bolo divertido com padrão axadrezado de dois sabores.' },
                        { name: 'Pastel de nata', price: 80, image: '/images/pastel_nata.png', desc: 'O ex-líbris da doçaria portuguesa: massa folhada e creme de ovos cremoso.' },
                        { name: 'Bolo de arroz', price: 65, image: '/images/bolo_arroz.png', desc: 'Bolo tradicional feito com farinha de arroz, com textura única.' },
                        { name: 'Donuts', price: 80, image: '/images/donuts.png', desc: 'Rosquinha frita com cobertura doce clássica.' },
                        { name: 'Charruto recheado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pudim', price: 600, image: '/images/pudim.png', desc: 'Pudim de ovos caseiro, suave e coberto de caramelo.' },
                        { name: 'Queques', price: 65, image: '/images/queques.png', desc: 'Bolo individual simples e fofo, perfeito para o lanche.' },
                        { name: 'Palmier recheado', price: 100, image: '/images/palmier_recheado.png', desc: 'Duas camadas de palmier recheadas com creme doce.' },
                        { name: 'Torta', price: 150, image: '/images/torta.png', desc: 'Torta caseira fofinha, perfeita para acompanhar o café.' },
                        { name: 'Waffle stick', price: 0, image: '/images/waffle_stick.png', desc: 'Delicioso waffle no palito, crocante por fora e macio por dentro.' },
                        { name: 'Folhado recheado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Beijinhos de coco', price: 120, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Biscoitos amanteigados', price: 120, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Caracol de canela', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Croisant recheado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bolo t26', price: 2500, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bolo t22', price: 1850, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pasteis de coco', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Guardanapo recheado c/ creme', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Brioche de frutas', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Broche rechado', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bolo t14', price: 750, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Mini folhados grama', price: 1.2, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Nevada', price: 80, image: '/images/nevada.png', desc: 'Bolo fofo coberto com creme branco e coco.' },
                        { name: 'Bolo t18', price: 1350, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Croisant simples', price: 60, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Bola de berlim', price: 80, image: '/images/bola_berlim.png', desc: 'Massa frita fofa, recheada com o nosso creme pasteleiro caseiro.' },
                        { name: 'Fatias normal', price: 150, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Palmier simples', price: 50, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Folhados & Salgados',
                    items: [
                        { name: 'Folhado de salsicha', price: 70, image: '/images/folhado_salsicha.png', desc: 'Salsicha saborosa envolta em massa folhada dourada.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Mini pizza', price: 50, image: '/images/pizza_mexicana.png', desc: 'Pequena pizza individual com queijo e molho de tomate.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Samosas / chamussas (50 cada)', price: 50, image: '/images/samosas.png', desc: 'Pastel triangular típico, com recheio condimentado.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Rissóis de camarão', price: 50, image: '/images/rissois_camarao.png', desc: 'Meia-lua panada com recheio cremoso de camarão.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Almofadinha', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Calzone', price: 80, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de frango', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de vegetais', price: 40, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Empadas', price: 100, image: '/images/empadas.png', desc: 'Massa quebrada tenra com recheio cremoso.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Empada de carne', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhados de carne', price: 100, image: '/images/folhados_carne.png', desc: 'Recheio de carne picada bem temperada em massa folhada.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants simples', price: 60, image: '/images/croissants_simples.png', desc: 'Croissant tipo brioche, macio e saboroso.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants chocolate', price: 80, image: '/images/croissants_chocolate.png', desc: 'Recheado com creme de chocolate rico.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Coxinhas', price: 50, image: '/images/coxinhas.png', desc: 'Salgado tradicional com recheio cremoso e massa crocante.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Empadas de frango', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Rissois', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'King pie frango/carne', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Mini subs', price: 60, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhado salsicha com queijo', price: 70, image: '/images/folhado_salsicha_queijo.png', desc: 'O clássico folhado de salsicha com um toque de queijo derretido.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhados recheados', price: 80, image: '/images/folhados_recheados.png', desc: 'Variedade de folhados com recheios deliciosos.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Mini folhados (kg)', price: 1000, image: '/images/mini_folhados.png', desc: 'Sortido de pequenos folhados, ideais para festas e snacks.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Folhados de salchicha', price: 70, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants recheados', price: 80, image: '/images/croissants_recheados.png', desc: 'Croissant com recheio doce especial.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Pie de vegetais', price: 100, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de peixe', price: 40, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Croissants folhados', price: 100, image: '/images/croissants_folhados.png', desc: 'Croissant clássico de massa folhada, leve e amanteigado.', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                        { name: 'Chamussas de carne', price: 50, image: '/images/pao_caseiro.png', desc: '', complements: [{ name: "Refresco", price: 50 }, { name: "Mais queijo", price: 50 }, { name: "Batata Frita", price: 100 }, { name: "Dose extra de batata", price: 150 }, { name: "Salada", price: 50 }] },
                    ]
                },
                {
                    title: 'Pães',
                    items: [
                        { name: 'Pao normal 50g', price: 5, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao portugues', price: 20, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão de cereais (com sementes)', price: 25, image: '/images/pao_cereais.png', desc: 'Pão saudável e nutritivo, rico em sementes selecionadas.' },
                        { name: 'Mini pao de forma 250g', price: 30, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Lingua da sogra 80g', price: 15, image: '/images/pao_caseiro.png', desc: '' },

                        { name: 'Manteiguinha clover 7g', price: 20, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Arrofadas 80g', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão integral', price: 12, image: '/images/pao_integral.png', desc: 'Rico em fibras, para uma alimentação mais saudável.' },
                        { name: 'Baguete frances', price: 70, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão de forma integral', price: 80, image: '/images/pao_forma_integral.png', desc: 'Ideal para sandes equilibradas e saudáveis.' },
                        { name: 'Mini pao de forma intergral 250g', price: 40, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão caseiro', price: 10, image: '/images/pao_caseiro.png', desc: 'O nosso pão tradicional, fresco a toda a hora.' },
                        { name: 'Pao de deus', price: 60, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão português', price: 10, image: '/images/pao_portugues.png', desc: 'Receita portuguesa autêntica, com côdea estaladiça e miolo fofo.' },
                        { name: 'Pao de forma 500g', price: 60, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de forma cereais', price: 50, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de forma integral 500g', price: 80, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao caserio 100g', price: 10, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de centeio', price: 35, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao caseiro grande', price: 40, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de humbuger/ cachoro', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao integral peq', price: 10, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Paozinho de leite 100g', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao de cereais c/ sementes', price: 40, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pão de forma simples', price: 60, image: '/images/pao_forma_simples.png', desc: 'Fofo e macio, perfeito para torradas ou sandes.' },
                        { name: 'Broa de milho', price: 20, image: '/images/broa_milho.png', desc: 'Broa densa e saborosa, feita com farinha de milho.' },
                        { name: 'Pao de agua', price: 15, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao normal 80g', price: 8, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao cassete', price: 16, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Pao crocodilo', price: 30, image: '/images/pao_caseiro.png', desc: '' },
                        { name: 'Saco de torrada', price: 20, image: '/images/pao_caseiro.png', desc: '' },
                    ]
                },
                {
                    title: 'Doces & Pastelaria',
                    items: [
                        { name: 'Palmier', price: 50, image: '/images/palmier.png', desc: 'Massa folhada caramelizada em formato de coração.' },
                        { name: 'Língua de sogra', price: 15, image: '/images/lingua_sogra.png', desc: 'Bolo comprido e macio com creme.' },
                        { name: 'Arrofadas', price: 15, image: '/images/arrofadas.png', desc: 'Pão doce tradicional, macio e ligeiramente açucarado.' },
                        { name: 'Charuto', price: 80, image: '/images/charuto.png', desc: 'Massa enrolada crocante com recheio doce.' },
                        { name: 'Laços', price: 60, image: '/images/lacos.png', desc: 'Massa folhada açucarada em formato de laço, leve e estaladiça.' },
                        { name: 'Rolo de açúcar e canela', price: 80, image: '/images/rolo_acucar_canela.png', desc: 'Caracóis de massa doce com o aroma quente da canela.' },
                        { name: 'Pão de deus', price: 60, image: '/images/pao_deus.png', desc: 'Pão brioche fofo com cobertura crocante de coco.' },
                        { name: 'Brioche com fruta', price: 80, image: '/images/brioche_fruta.png', desc: 'Massa brioche enriquecida com frutas cristalizadas.' },
                        { name: 'Pastel de coco', price: 80, image: '/images/pastel_coco.png', desc: 'Tartelete deliciosa com recheio rico de coco.' },
                    ]
                },
            ]
        },
    }
};
