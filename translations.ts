
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
            title: '',
            subtitle: 'O sabor que aquece o coração.',
            description: 'Mais do que pão, entregamos carinho em forma de sabor. Produzido diariamente com ingredientes seleccionados, o nosso pão traz o conforto e a tradição que a sua família merece. Experimente o verdadeiro gosto de casa.',
            order: 'Fazer Encomenda',
            viewMenu: 'Ver Menu',
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
            form: {
                title: 'Estás com alguma dúvida?',
                subtitle: 'Preencha o formulário e a nossa equipe entrará em contacto o mais breve possível.',
                name: 'Nome',
                namePlaceholder: 'Seu nome',
                email: 'Email',
                emailPlaceholder: 'email@exemplo.com',
                phone: 'Telefone',
                phonePlaceholder: '+258 8x xxx xxxx',
                message: 'Mensagem',
                messagePlaceholder: 'O que gostaria de encomendar ou perguntar?',
                send: 'Enviar Mensagem',
                sending: 'Enviando...',
                success: 'Mensagem enviada com sucesso! Entraremos em contacto em breve.',
                error: 'Erro ao enviar mensagem. Por favor, tente novamente.'
            },
            visit: {
                badge: 'Localização',
                title: 'Visite a nossa Padaria',
                addressLabel: 'Endereço',
                location: 'Av. acordo Lusaka Lichinga Niassa, 3300, Moçambique',
                emails: ['geral@paocaseiro.co.mz', 'suporte@paocaseiro.co.mz']
            }
        },
        footer: {
            description: 'A Padaria Pão Caseiro oferece pães fresquinhos todos os dias, preparados de forma artesanal com ingredientes selecionados. Aqui você encontra sabor, qualidade e um atendimento que aquece o coração.',
            quickLinks: 'Links Rápidos',
            contacts: 'Contactos',
            privacy: 'Política de Privacidade',
            terms: 'Termos de Serviço',
            phoneLabel: 'Telefone / Encomendas',
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
                pending: 'Pendente',
                confirmed: 'Confirmado',
                kitchen: 'Na Cozinha',
                ready: 'Pronto',
                delivering: 'A Caminho',
                arrived: 'Chegou',
                completed: 'Entregue',
                cancelled: 'Cancelado'
            },
            queue: {
                title: 'Fila de Atendimento',
                subtitle: 'Tire a sua senha e aguarde confortavelmente',
                normal: 'Normal',
                priority: 'Prioritária',
                yourTicket: 'Sua Senha',
                waiting: 'Em Espera',
                peopleAhead: 'pessoas à frente',
                yourTurn: 'Sua Vez!',
                mainCounter: 'Balcão Principal',
                dirijaSeAo: 'Dirija-se ao',
                senha: 'Senha',
                voltar: 'Voltar',
                servico: 'Serviço',
                atendimento: 'Tipo de Atendimento',
                validar: 'Validar Prioridade',
                introduza: 'Introduza o seu telemóvel',
                enviar: 'Enviar SMS',
                verificar: 'Verificar SMS',
                mudar: 'Mudar Número',
                confirmar: 'Confirmar',
                suaSenha: 'SUA SENHA',
                novaSenha: 'Pedir nova senha',
                waitingPeople: 'Pessoas a aguardar',
                avgWaitTime: 'Tempo Médio Espera',
                calling: 'A Chamar',
                nextInLine: 'Seguintes em Linha',
                lastCalls: 'Últimas Chamadas',
                available: 'Disponível',
                activateSound: 'Ativar Som para Chamadas'
            },
            tracking: {
                title: 'Acompanhar Encomenda',
                noActive: 'Sem Encomendas Ativas',
                noActiveDesc: 'As suas encomendas ativas aparecerão aqui para acompanhamento.',
                trackByCode: 'Acompanhar por código...',
                noOrdersFound: 'Nenhuma encomenda ativa encontrada',
                trySearching: 'Tente pesquisar pelo código acima',
                active: 'Ativa',
                actives: 'Ativas',
                currentStatus: 'Estado Atual',
                estArrival: 'Chegada Est.',
                liveSupport: 'Suporte Direto',
                items: 'Artigos',
                products: 'Produtos',
                orderedAt: 'Pedido há',
                trackAnother: 'Rastrear Outro Pedido',
                byCode: 'Por código...',
                pendingTracker: 'Lista Pendente',
                more: 'mais',
                tracking1: 'Acompanhando 1 Pedido Ativo'
            },
            waSupport: {
                title: 'Suporte WhatsApp',
                desc: 'Fale directamente com a nossa equipa para assistência imediata.',
                open: 'Abrir Chat'
            },
            phonePrompt: {
                title: 'Confirme o seu Telemóvel',
                desc: 'Por favor, introduza o seu número de WhatsApp para podermos notificar sobre o estado dos seus pedidos.',
                confirm: 'Confirmar Dados'
            },
            alerts: {
                ticketError: 'Erro ao solicitar senha: ',
                itemsAdded: 'Itens adicionados ao carrinho!',
                orderCancelled: 'Encomenda cancelada com sucesso.',
                cancelError: 'Erro ao cancelar a encomenda. Pode já estar em preparação.',
                noOrderFound: 'Nenhuma encomenda encontrada com este código.',
                searchError: 'Erro ao procurar encomenda.',
                confirmCancel: 'Tem a certeza que deseja cancelar esta encomenda?'
            },
            change: 'Mudar'
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
                        { name: 'Palmier', price: 50, image: '/assets/products/palmier.png', desc: 'Massa folhada crocante e açucarada em formato de coração.' },
                        { name: 'Palmier recheado', price: 100, image: '/assets/products/palmier-recheado.png', desc: 'O nosso palmier clássico com um recheio generoso de creme.' },
                        { name: 'Folhados recheados', price: 80, image: '/assets/products/folhados-recheados.png', desc: 'Variedade de folhados com recheios doces e salgados.' },
                        { name: 'Pastel de Nata', price: 80, image: '/assets/products/pastel-de-nata.png', desc: 'O clássico doce português com massa crocante e creme aveludado.' },
                        { name: 'Pastel de coco', price: 80, image: '/assets/products/pastel-de-coco.png', desc: 'Delicioso pastel com recheio húmido e intenso de coco.' },
                        { name: 'Folhado de salsicha', price: 70, image: '/assets/products/folhado-salsicha.png', desc: 'Salsicha de qualidade envolvida em massa folhada leve.' },
                        { name: 'Croissants folhados', price: 80, image: '/assets/products/croissants-folhados.png', desc: 'Croissants leves e amanteigados com múltiplas camadas.' },
                        { name: 'Empadas recheadas', price: 100, image: '/assets/products/empadas.png', desc: 'Empadas artesanais com recheios tradicionais e saborosos.' },
                        { name: 'Mini folhados (kg)', price: 1000, image: '/assets/products/mini-folhados.png', desc: 'Sortido de mini folhados perfeitos para eventos e partilha.' },
                    ]
                },
                {
                    title: 'Brioches',
                    items: [
                        { name: 'Brioche recheado', price: 80, image: '/assets/products/brioche-fruta.png', desc: 'Pão brioche macio com recheio cremoso e cobertura especial.' },
                        { name: 'Donuts', price: 80, image: '/assets/products/donuts.png', desc: 'Rosquinhas fofinhas com diversas coberturas e recheios.' },
                        { name: 'Bola de Berlim', price: 80, image: '/assets/products/bola-berlim.png', desc: 'Massa frita e fofinha recheada com o tradicional creme pasteleiro.' },
                        { name: 'Nevada', price: 80, image: '/assets/products/nevada.png', desc: 'Bolo fofo com cobertura branca como a neve, leve e doce.' },
                        { name: 'Croissants simples', price: 60, image: '/assets/products/croissants-simples.png', desc: 'O clássico croissant brioche, macio e perfeito para o café.' },
                        { name: 'Croissant recheado', price: 80, image: '/assets/products/croissants-recheados.png', desc: 'Croissant brioche com recheios doces ou salgados à escolha.' },
                        { name: 'Charuto', price: 80, image: '/assets/products/charuto.png', desc: 'Massa delicada enrolada com recheio cremoso irresistível.' },
                        { name: 'Croissants chocolate', price: 80, image: '/assets/products/croissants-chocolate.png', desc: 'Croissant recheado com chocolate belga de alta qualidade.' },
                        { name: 'Rolo de açúcar e canela', price: 80, image: '/assets/products/rolo-acucar-canela.png', desc: 'Massa enrolada com o aroma reconfortante de canela e açúcar.' },
                        { name: 'Pão de Deus', price: 60, image: '/assets/products/pastel-de-coco.png', desc: 'Pão brioche macio com uma generosa cobertura de coco.' },
                        { name: 'Laços', price: 60, image: '/assets/products/lacos.png', desc: 'Pastéis em formato de laço, crocantes e açucarados.' },
                        { name: 'Arrofadas', price: 15, image: '/assets/products/arrofadas.png', desc: 'Pães doces tradicionais, perfeitos para o lanche das crianças.' },
                        { name: 'Língua de Sogra', price: 15, image: '/assets/products/lingua-sogra.png', desc: 'Massa alongada e fofinha com cobertura de açúcar.' },
                        { name: 'Biscoitos (kg)', price: 1200, image: '/assets/products/biscoitos-amanteigados.png', desc: 'Variedade de biscoitos amanteigados que derretem na boca.' },
                    ]
                },
                {
                    title: 'Waffle',
                    items: [
                        { name: 'Waffle Stick', price: 200, image: '/assets/products/waffle-stick.png', desc: 'Waffle fresquinho no palito, perfeito para um doce rápido.' },
                    ]
                },
                {
                    title: 'Pizzas Grandes',
                    items: [
                        { name: 'Frango', price: 700, image: '/assets/products/pizza-frango.png', desc: 'Pizza clássica de frango com molho de tomate e queijo mozzarella.' },
                        { name: 'Atum', price: 700, image: '/assets/products/pizza-atum.png', desc: 'Atum premium, cebola fresca e azeitonas sobre base crocante.' },
                        { name: 'Margarita', price: 700, image: '/assets/products/mini-pizza.png', desc: 'A simplicidade perfeita: tomate, mozzarella e manjericão.' },
                        { name: 'Palony/Pepperoni', price: 700, image: '/assets/products/pizza-pepperoni.png', desc: 'Fatias picantes de pepperoni sobre queijo derretido.' },
                        { name: '4 Estações', price: 800, image: '/assets/products/pizza-4-estacoes.png', desc: 'Quatro sabores distintos numa só pizza para todos os gostos.' },
                    ]
                },
                {
                    title: 'Pizzas Médias',
                    items: [
                        { name: 'Frango', price: 600, image: '/assets/products/pizza-frango.png', desc: 'Pizza média de frango com tempero especial da casa.' },
                        { name: 'Atum', price: 600, image: '/assets/products/pizza-atum.png', desc: 'Delicioso atum com cebola e queijo em tamanho médio.' },
                        { name: 'Margarita', price: 600, image: '/assets/products/mini-pizza.png', desc: 'Clássica margarita média, leve e saborosa.' },
                        { name: 'Palony/Pepperoni', price: 600, image: '/assets/products/pizza-pepperoni.png', desc: 'Pepperoni de qualidade em tamanho ideal para partilhar.' },
                        { name: '4 Estações', price: 700, image: '/assets/products/pizza-4-estacoes.png', desc: 'A nossa famosa 4 estações em versão média.' },
                    ]
                },
                {
                    title: 'Fatias e Bolos',
                    items: [
                        { name: 'Queque', price: 65, image: '/assets/products/queques.png', desc: 'Bolo individual fofinho e tradicional, ideal para qualquer hora.' },
                        { name: 'Bolo de arroz', price: 65, image: '/assets/products/bolo-arroz.png', desc: 'Clássico bolo de arroz com textura leve e sabor delicado.' },
                        { name: 'Torta', price: 85, image: '/assets/products/torta.png', desc: 'Fatia de torta húmida e recheada com sabores tradicionais.' },
                        { name: 'Fatia xadrez', price: 150, image: '/assets/products/fatias-xadrez.png', desc: 'Bolo visualmente atraente com camadas intercaladas e sabor intenso.' },
                        { name: 'Fatia folhado de canela', price: 150, image: '/assets/products/bolot24.png', desc: 'Combinação perfeita de massa folhada e o aroma da canela.' },
                        { name: 'Fatias mix', price: 150, image: '/assets/products/bolot26.png', desc: 'Sortido de fatias de bolos variados para experimentar diferentes sabores.' },
                    ]
                },
                {
                    title: 'Bolos Inteiros/Encomenda',
                    items: [
                        { name: 'Bolo de Cenoura c/ Chocolate', price: 1200, image: '/assets/products/bolo20.png', isSpecial: true, desc: 'Bolo de cenoura caseiro com cobertura generosa de chocolate.' },
                        { name: 'Bolo de Laranja', price: 1000, image: '/assets/products/bolot24.png', isSpecial: true, desc: 'Clássico bolo de laranja, húmido e com aroma natural.' },
                        { name: 'Bolo de Chocolate Húmido', price: 1500, image: '/assets/products/bolot26.png', isSpecial: true, desc: 'Intenso sabor a chocolate numa massa irresistivelmente húmida.' },
                        { name: 'Bolo Red Velvet', price: 1800, image: '/assets/products/bolo-t14.png', isSpecial: true, desc: 'Bolo aveludado com leve toque de cacau e recheio cremoso.' },
                        { name: 'Cheesecake (Morango/Maracujá)', price: 1600, image: '/assets/products/cakes.png', isSpecial: true, desc: 'Sobremesa fresca e cremosa com cobertura de fruta selecionada.' },
                        { name: 'Tarte de Amêndoa', price: 1400, image: '/assets/products/fatias-xadrez.png', isSpecial: true, desc: 'Base crocante com cobertura rica em amêndoas torradas.' },
                    ]
                },
                {
                    title: 'Salgados',
                    items: [
                        { name: 'Rissóis de camarão', price: 50, image: '/assets/products/rissois-camarao.png', desc: 'Salgado crocante com recheio cremoso de camarão selecionado.' },
                        { name: 'Samosa carne/peixe/frango/queijo', price: 50, image: '/assets/products/chamussaS.png', desc: 'Triângulos crocantes com recheios variados e tempero especial.' },
                        { name: 'Samosa vegetais', price: 35, image: '/assets/products/chamussaS.png', desc: 'Opção vegetariana deliciosa com legumes frescos e especiarias.' },
                        { name: 'Coxinhas', price: 50, image: '/assets/products/coxinhas.png', desc: 'Massa de batata recheada com frango desfiado e temperado.' },
                        { name: 'Mini pizza', price: 50, image: '/assets/products/mini-pizza.png', desc: 'Pequena no tamanho, mas grande no sabor, com queijo e tomate.' },
                        { name: 'Croquete', price: 50, image: '/assets/products/rissois-camarao.png', desc: 'Clássico croquete de carne com exterior crocante e interior macio.' },
                        { name: 'Folhados pies de batata', price: 80, image: '/assets/products/folhados-carne.png', desc: 'Folhado recheado com um puré de batata temperado e suave.' },
                        { name: 'Folhados de frango', price: 100, image: '/assets/products/folhado-salsicha.png', desc: 'Massa folhada leve com recheio de frango suculento.' },
                    ]
                },
                {
                    title: 'Pães',
                    items: [
                        { name: 'Pão de forma (grande)', price: 60, image: '/assets/products/pao-forma-simples.png', desc: 'Pão de forma macio, ideal para sanduíches em família.' },
                        { name: 'Pão de forma (pequeno)', price: 30, image: '/assets/products/pao-forma-simples.png', desc: 'Versão compacta do nosso pão de forma fresquinho.' },
                        { name: 'Pão caseiro', price: 10, image: '/assets/products/pao-caseiro.png', desc: 'O nosso pão rústico tradicional, feito com amor todos os dias.' },
                        { name: 'Pão integral', price: 12, image: '/assets/products/pao-integral.png', desc: 'Pão rico em fibras para um pequeno-almoço equilibrado.' },
                        { name: 'Pão cassete integral', price: 15, image: '/assets/products/pao-forma-integral.png', desc: 'Pão individual integral com textura densa e saborosa.' },
                        { name: 'Pão hamburguer/cachorro', price: 15, image: '/assets/products/cachorro-quente.png', desc: 'Pão macio e resistente, perfeito para os seus lanches.' },
                        { name: 'Pão de centeio', price: 35, image: '/assets/products/pao-cereais.png', desc: 'Pão de centeio autêntico com sabor robusto e nutritivo.' },
                        { name: 'Pão de cereais', price: 40, image: '/assets/products/pao-cereais.png', desc: 'Pão multiceais com sementes seleccionadas para extra sabor.' },
                        { name: 'Pão forma integral grande', price: 80, image: '/assets/products/pao-forma-integral.png', desc: 'Pão de forma integral em tamanho grande para toda a semana.' },
                        { name: 'Pão forma integral pequeno', price: 40, image: '/assets/products/pao-forma-integral.png', desc: 'Pão de forma integral prático para o dia-a-dia.' },
                        { name: 'Pão de água', price: 8, image: '/assets/products/pao-caseiro.png', desc: 'Pão leve e crocante, a base perfeita para qualquer refeição.' },
                        { name: 'Pão d’água', price: 5, image: '/assets/products/pao-caseiro.png', desc: 'Versão mini do nosso pão de água sempre fresco.' },
                        { name: 'Broa de milho', price: 60, image: '/assets/products/broa-milho.png', desc: 'Densa e saborosa, a broa de milho tradicional moçambicana.' },
                        { name: 'Torradas', price: 20, image: '/assets/products/sacos-de-torrada.png', desc: 'Fatias crocantes prontas para acompanhar o seu chá ou café.' },
                        { name: 'Baguete francês', price: 70, image: '/assets/products/pao-portugues.png', desc: 'Baguete ao estilo francês, crocante por fora e macia por dentro.' },
                        { name: 'Cassete', price: 16, image: '/assets/products/pao-forma-simples.png', desc: 'Pão cassete clássico, fofinho e ideal para acompanhar manteiga.' },
                    ]
                },
                {
                    title: 'Lanches',
                    items: [
                        { name: 'Shawarma de carne', price: 350, image: '/assets/products/shawarma-de-frango.png', desc: 'Carne suculenta com especiarias enrolada no nosso pão fino.' },
                        { name: 'Shawarma de galinha', price: 300, image: '/assets/products/shawarma-de-frango.png', desc: 'Frango bem temperado, suculento e cheio de sabor oriental.' },
                        { name: 'Cachorro quente completo', price: 300, image: '/assets/products/cachorro-quente.png', desc: 'O lanche reconfortante recheado de sabor e qualidade.' },
                        { name: 'Cachorro quente simples', price: 250, image: '/assets/products/cachorro-quente.png', desc: 'Simples, rápido e incrivelmente apetitoso.' },
                        { name: 'Hambúrguer completo', price: 350, image: '/assets/products/hamburguer-completo.png', desc: 'O verdadeiro gigante dos lanches, com sabor do primeiro ao último trinca.' },
                        { name: 'Hambúrguer simples', price: 300, image: '/assets/products/hamburguer-simples.png', desc: 'Carne suculenta e saborosa para quem prefere o clássico.' },
                    ]
                },
                {
                    title: 'Extras',
                    items: [
                        { name: 'Maionese', price: 30, image: '/assets/products/maionese.png', desc: 'Cremoso e saboroso, o toque final para os seus lanches.' },
                        { name: 'Ketchup', price: 30, image: '/assets/products/ketchup.png', desc: 'O acompanhamento clássico que nunca pode faltar.' },
                        {
                        name: 'Batata Frita',
                        price: 150,
                        desc: 'Crocantes, douradas e acabadas de fazer.',
                        image: '/assets/products/batata-frita.png'
                    },
                    { name: 'Molho Picante', price: 30, image: '/assets/products/molho-picante.png', desc: 'Para quem gosta de um toque extra de calor no lanche.' },
                    ]
                },
                {
                    title: 'Refrigerantes',
                    items: [
                        { name: 'Coca-Cola 300ml', price: 60, image: '/assets/products/coca-cola-300ml.png', desc: 'A bebida clássica geladinha para partilhar com o seu lanche.' },
                        { name: 'Fanta Laranja 300ml', price: 60, image: '/assets/products/fanta-laranja-300ml.png', desc: 'Frescura cítrica e borbulhante para acompanhar os salgados.' },
                        { name: 'Sprite 300ml', price: 60, image: '/assets/products/sprite-300ml.png', desc: 'Refrescante, leve e com sabor a limão. Combina com tudo!' },
                        { name: 'Compal 300ml', price: 80, image: '/assets/products/compal-300ml.png', desc: 'Sabor autêntico da fruta, refrescante a cada gole.' },
                        { name: 'Água da Namaacha 500ml', price: 60, image: '/assets/products/agua-namaacha-500ml.png', desc: 'Refrescante, pura e local, direta para a sua garrafa.' },
                    ]
                },
            ]
        },
        terms: {
            title: 'Termos de Serviço',
            subtitle: 'Padaria e Pastelaria Pão Caseiro (Moçambique)',
            section1Title: '1. Aceitação dos Termos',
            section1Content: 'Ao aceder e utilizar o website da Pão Caseiro (paocaseiro.co.mz), o utilizador aceita cumprir e ficar vinculado aos presentes Termos de Serviço e a todas as leis e regulamentos aplicáveis na República de Moçambique.',
            section2Title: '2. Encomendas e Pagamentos',
            section2Content: 'Todas as encomendas estão sujeitas a disponibilidade de stock. Os preços são indicados em Meticais (MZN) e incluem o IVA à taxa legal em vigor. O pagamento deve ser efetuado através dos canais de pagamento móvel integrados (M-Pesa, E-Mola, M-Kesh) ou outros métodos explicitamente aceites no checkout.',
            section3Title: '3. Entregas e Qualidade',
            section3Content: 'A Pão Caseiro compromete-se a entregar os produtos frescos dentro do horário acordado. Caso ocorra algum problema com a qualidade ou integridade do produto no momento da entrega, o cliente deve reportar imediatamente ao estafeta ou através dos nossos canais de apoio ao cliente.',
            section4Title: '4. Responsabilidade do Utilizador',
            section4Content: 'O utilizador é responsável por manter a confidencialidade da sua conta e palavra-passe. Qualquer atividade realizada através da sua conta será da sua inteira responsabilidade. A Pão Caseiro reserva-se o direito de recusar serviço ou cancelar contas em caso de uso indevido.',
            section5Title: '5. Política de Cancelamento de Encomendas',
            section5Content: 'O cliente tem o direito de solicitar o cancelamento da sua encomenda através do seu painel de registo (Dashboard). O cancelamento autónomo só é permitido caso a encomenda ainda se encontre no estado "Pendente". Uma vez transitada para "Em Preparação", o pedido de cancelamento deverá ser encaminhado aos nossos canais de apoio, podendo estar sujeito a retenção do valor por motivos de alocação de ingredientes e labor já incorrido visando garantir a nossa sustentabilidade.',
            legalNoteTitle: 'Nota Legal',
            legalNoteContent: 'Estes termos podem ser atualizados periodicamente para refletir mudanças nos nossos serviços ou requisitos legais. Recomendamos a consulta frequente desta página.'
        },
        privacy: {
            title: 'Política de Privacidade',
            subtitle: 'Proteção de Dados e Privacidade',
            lastUpdate: 'Última atualização: 04/03/2026',
            section1Title: '1. Recolha de Dados Pessoais',
            section1Content: 'A Pão Caseiro recolhe e armazena os dados pessoais fornecidos (nome, telemóvel, morada e e-mail) apenas com o intuito de facilitar a encomenda e entrega dos nossos produtos, além de notificar os clientes sobre o estado do seu serviço.',
            section2Title: '2. Uso e Partilha de Informação',
            section2Content: 'Todas as partes registadas são preservadas internamente na base de dados da Pão Caseiro. Os seus números e meios de contacto são utilizados em exclusivo para comunicações entre a plataforma e o cliente (confirmação de OTP, tracking de encomenda) ou campanhas promocionais de marketing da própria loja.',
            guarantee: 'Garantimos que nenhum dado é alugado, partilhado ou vendido a entidades terceiras ou exteriores.',
            section3Title: '3. Proteção e Segurança',
            section3Content: 'A gestão da base de dados é estritamente executada por administradores qualificados da Pão Caseiro ou afiliados de IT, onde são implementadas medidas de segurança consistentes segundo as disposições legais aplicadas na República de Moçambique. Sendo nós a única entidade de gestão e acesso às matrizes primárias destes dados.',
            section4Title: '4. Direitos do Cliente',
            section4Content: 'A qualquer momento enquanto utilizador livre da plataforma, pode solicitar informações detalhadas sobre as informações registadas a seu respeito ou apagar totalmente o seu rasto do nosso ecossistema, contactando a gerência da nossa equipa através dos Canais de Suporte oficiais.',
            section5Title: '5. Gestão de Cancelamentos (Logs)',
            section5Content: 'Quando uma encomenda é ativamente cancelada pelo utilizador no Painel de Cliente, a operação é devidamente executada, travando o prosseguimento da mesma. No entanto, por razões associadas a métricas de segurança, prevenção de comportamentos fraudulentos e arquivo fiscal, os metadados de pedidos cancelados transitam para um histórico inativo e seguro (Read-Only) não sendo apagados instantaneamente das tabelas primárias de suporte.'
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
            title: '',
            subtitle: 'The taste that warms the heart.',
            description: 'More than bread, we deliver affection in the form of flavor. Produced daily with selected ingredients, our bread brings the comfort and tradition your family deserves. Experience the true taste of home.',
            order: 'Order Now',
            viewMenu: 'View Menu',
            gallery: 'View Blog',
            call: 'Talk to us'
        },
        video: {
            title: 'See how our bread is made',
            subtitle: 'A minute in our kitchen: from irresistible pastries to rustic breads, see how the magic happens every day.',
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
                title: 'Do you have any questions?',
                subtitle: 'Fill out the form and our team will contact you as soon as possible.',
                name: 'Name',
                namePlaceholder: 'Your name',
                email: 'Email',
                emailPlaceholder: 'email@example.com',
                phone: 'Phone',
                phonePlaceholder: '+258 8x xxx xxxx',
                message: 'Message',
                messagePlaceholder: 'What would you like to order or ask?',
                send: 'Send Message',
                sending: 'Sending...',
                success: 'Message sent successfully! We will contact you soon.',
                error: 'Error sending message. Please try again.'
            },
            visit: {
                badge: 'Location',
                title: 'Visit our Bakery',
                addressLabel: 'Address',
                desc: 'Stop by, smell the aroma, and make yourself at home. We are waiting — come get hot bread or have a coffee.',
                locationLabel: 'Lichinga',
                location: 'Av. acordo Lusaka Lichinga Niassa, 3300, Mozambique',
                phoneLabel: 'Call us',
                emailLabel: 'Email',
                emails: ['geral@paocaseiro.co.mz', 'suporte@paocaseiro.co.mz']
            }
        },
        footer: {
            description: 'Padaria Pão Caseiro offers fresh bread every day, prepared by hand with selected ingredients. Here you find flavor, quality, and service that warms the heart.',
            quickLinks: 'Quick Links',
            contacts: 'Contacts',
            privacy: 'Privacy Policy',
            terms: 'Terms of Service',
            phoneLabel: 'Phone / Orders',
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
                pending: 'Pending',
                confirmed: 'Confirmed',
                kitchen: 'In Kitchen',
                ready: 'Ready',
                delivering: 'On the Way',
                arrived: 'Arrived',
                completed: 'Delivered',
                cancelled: 'Cancelled'
            },
            queue: {
                title: 'Service Queue',
                subtitle: 'Get your ticket and wait comfortably',
                normal: 'Normal',
                priority: 'Priority',
                yourTicket: 'Your Ticket',
                waiting: 'Waiting',
                peopleAhead: 'people ahead',
                yourTurn: 'Your Turn!',
                mainCounter: 'Main Counter',
                dirijaSeAo: 'Please go to',
                senha: 'Ticket',
                voltar: 'Back',
                servico: 'Service',
                atendimento: 'Service Type',
                validar: 'Validate Priority',
                introduza: 'Enter your phone number',
                enviar: 'Send SMS',
                verificar: 'Verify SMS',
                mudar: 'Change Number',
                confirmar: 'Confirm',
                suaSenha: 'YOUR TICKET',
                novaSenha: 'Get new ticket',
                waitingPeople: 'People Waiting',
                avgWaitTime: 'Avg. Wait Time',
                calling: 'Calling',
                nextInLine: 'Next in Line',
                lastCalls: 'Last Calls',
                available: 'Available',
                activateSound: 'Activate Sound for Calls'
            },
            tracking: {
                title: 'Track Order',
                noActive: 'No Active Orders',
                noActiveDesc: 'Your active orders will appear here for tracking.',
                trackByCode: 'Track by order code...',
                noOrdersFound: 'No active orders found',
                trySearching: 'Try searching by code above',
                active: 'Active',
                actives: 'Active',
                currentStatus: 'Current Status',
                estArrival: 'Est. Arrival',
                liveSupport: 'Live Support',
                items: 'Items',
                products: 'Products',
                orderedAt: 'Ordered At',
                trackAnother: 'Track Another Order',
                byCode: 'By code...',
                pendingTracker: 'Pending Tracker List',
                more: 'more',
                tracking1: 'Tracking 1 Active Order'
            },
            waSupport: {
                title: 'WhatsApp Support',
                desc: 'Chat directly with our team for immediate assistance.',
                open: 'Open Chat'
            },
            phonePrompt: {
                title: 'Confirm your Phone Number',
                desc: 'Please provide your WhatsApp number so we can notify you about your order status.',
                confirm: 'Confirm Details'
            },
            alerts: {
                ticketError: 'Error requesting ticket: ',
                itemsAdded: 'Items added to cart!',
                orderCancelled: 'Order cancelled successfully.',
                cancelError: 'Failed to cancel the order. It might already be in preparation.',
                noOrderFound: 'No order found with this code.',
                searchError: 'Error searching for order.',
                confirmCancel: 'Are you sure you want to cancel this order?'
            },
            change: 'Change'
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
                    title: 'Pastries & Sweets',
                    items: [
                        { name: 'Palmier', price: 50, image: '/assets/products/palmier.png', desc: 'Crispy and sugary heart-shaped puff pastry.' },
                        { name: 'Filled Palmier', price: 100, image: '/assets/products/palmier-recheado.png', desc: 'Our classic palmier with a generous cream filling.' },
                        { name: 'Filled Pastries', price: 80, image: '/assets/products/folhados-recheados.png', desc: 'Variety of puff pastries with sweet and savory fillings.' },
                        { name: 'Custard Tart (Pastel de Nata)', price: 80, image: '/assets/products/pastel-de-nata.png', desc: 'The classic Portuguese sweet with crispy pastry and velvety cream.' },
                        { name: 'Coconut Tart', price: 80, image: '/assets/products/pastel-de-coco.png', desc: 'Delicious tart with a moist and intense coconut filling.' },
                        { name: 'Sausage Pastry', price: 70, image: '/assets/products/folhado-salsicha.png', desc: 'Quality sausage wrapped in light puff pastry.' },
                        { name: 'Puff Croissants', price: 80, image: '/assets/products/croissants-folhados.png', desc: 'Light and buttery croissants with multiple layers.' },
                        { name: 'Filled Pies (Empadas)', price: 100, image: '/assets/products/empadas.png', desc: 'Handmade pies with traditional and tasty fillings.' },
                        { name: 'Mini Pastries (kg)', price: 1000, image: '/assets/products/mini-folhados.png', desc: 'Assorted mini pastries perfect for events and sharing.' },
                    ]
                },
                {
                    title: 'Brioches',
                    items: [
                        { name: 'Filled Brioche', price: 80, image: '/assets/products/brioche-fruta.png', desc: 'Soft brioche bread with creamy filling and special topping.' },
                        { name: 'Donuts', price: 80, image: '/assets/products/donuts.png', desc: 'Fluffy donuts with various toppings and fillings.' },
                        { name: 'Berlin Ball', price: 80, image: '/assets/products/bola-berlim.png', desc: 'Fried and fluffy dough filled with traditional pastry cream.' },
                        { name: 'Nevada', price: 80, image: '/assets/products/nevada.png', desc: 'Fluffy cake with snow-white topping, light and sweet.' },
                        { name: 'Plain Croissants', price: 60, image: '/assets/products/croissants-simples.png', desc: 'The classic brioche croissant, soft and perfect for coffee.' },
                        { name: 'Filled Croissant', price: 80, image: '/assets/products/croissants-recheados.png', desc: 'Brioche croissant with your choice of sweet or savory fillings.' },
                        { name: 'Charuto', price: 80, image: '/assets/products/charuto.png', desc: 'Delicate dough rolled with an irresistible creamy filling.' },
                        { name: 'Chocolate Croissants', price: 80, image: '/assets/products/croissants-chocolate.png', desc: 'Croissant filled with high-quality Belgian chocolate.' },
                        { name: 'Sugar and Cinnamon Roll', price: 80, image: '/assets/products/rolo-acucar-canela.png', desc: 'Rolled dough with the comforting aroma of cinnamon and sugar.' },
                        { name: 'Pão de Deus (Coconut Bread)', price: 60, image: '/assets/products/pastel-de-coco.png', desc: 'Soft brioche bread with a generous coconut topping.' },
                        { name: 'Bowties (Laços)', price: 60, image: '/assets/products/lacos.png', desc: 'Bow-shaped pastries, crispy and sugary.' },
                        { name: 'Arrofadas', price: 15, image: '/assets/products/arrofadas.png', desc: 'Traditional sweet breads, perfect for kids\' snacks.' },
                        { name: 'Mother-in-law\'s Tongue', price: 15, image: '/assets/products/lingua-sogra.png', desc: 'Elongated and fluffy dough with sugar topping.' },
                        { name: 'Biscuits (kg)', price: 1200, image: '/assets/products/biscoitos-amanteigados.png', desc: 'Variety of butter biscuits that melt in your mouth.' },
                    ]
                },
                {
                    title: 'Waffle',
                    items: [
                        { name: 'Waffle Stick', price: 200, image: '/assets/products/waffle-stick.png', desc: 'Freshly baked waffle on a stick, perfect for a quick sweet treat.' },
                    ]
                },
                {
                    title: 'Large Pizzas',
                    items: [
                        { name: 'Chicken', price: 700, image: '/assets/products/pizza-frango.png', description_en: 'Classic chicken pizza with tomato sauce and mozzarella.' },
                        { name: 'Tuna', price: 700, image: '/assets/products/pizza-atum.png', description_en: 'Premium tuna, fresh onions and olives on a crispy base.' },
                        { name: 'Margarita', price: 700, image: '/assets/products/mini-pizza.png', description_en: 'The perfect simplicity: tomato, mozzarella and basil.' },
                        { name: 'Palony/Pepperoni', price: 700, image: '/assets/products/pizza-pepperoni.png', description_en: 'Spicy pepperoni slices over melted cheese.' },
                        { name: '4 Seasons', price: 800, image: '/assets/products/pizza-4-estacoes.png', description_en: 'Four distinct flavors in one pizza for all tastes.' },
                    ]
                },
                {
                    title: 'Medium Pizzas',
                    items: [
                        { name: 'Chicken', price: 600, image: '/assets/products/pizza-frango.png', description_en: 'Medium chicken pizza with house special seasoning.' },
                        { name: 'Tuna', price: 600, image: '/assets/products/pizza-atum.png', description_en: 'Delicious tuna with onion and cheese in medium size.' },
                        { name: 'Margarita', price: 600, image: '/assets/products/mini-pizza.png', description_en: 'Classic medium margarita, light and tasty.' },
                        { name: 'Palony/Pepperoni', price: 600, image: '/assets/products/pizza-pepperoni.png', description_en: 'Quality pepperoni in ideal size for sharing.' },
                        { name: '4 Seasons', price: 700, image: '/assets/products/pizza-4-estacoes.png', description_en: 'Our famous 4 seasons in medium version.' },
                    ]
                },
                {
                    title: 'Slices & Cakes',
                    items: [
                        { name: 'Muffin (Queque)', price: 65, image: '/assets/products/queques.png', desc: 'Fluffy and traditional individual cake, ideal for any time.' },
                        { name: 'Rice Cake', price: 65, image: '/assets/products/bolo-arroz.png', desc: 'Classic rice cake with light texture and delicate flavor.' },
                        { name: 'Roll Cake (Torta)', price: 85, image: '/assets/products/torta.png', desc: 'Slice of moist roll cake filled with traditional flavors.' },
                        { name: 'Checkered Slice', price: 150, image: '/assets/products/fatias-xadrez.png', desc: 'Visually appealing cake with alternating layers and intense flavor.' },
                        { name: 'Cinnamon Puff Slice', price: 150, image: '/assets/products/bolot24.png', desc: 'Perfect combination of puff pastry and the aroma of cinnamon.' },
                        { name: 'Mix Slices', price: 150, image: '/assets/products/bolot26.png', desc: 'Assortment of various cake slices to try different flavors.' },
                    ]
                },
                {
                    title: 'Whole Cakes / Pre-order',
                    items: [
                        { name: 'Carrot Cake w/ Chocolate', price: 1200, image: '/assets/products/bolo20.png', isSpecial: true, desc: 'Homemade carrot cake with a generous chocolate topping.' },
                        { name: 'Orange Cake', price: 1000, image: '/assets/products/bolot24.png', isSpecial: true, desc: 'Classic orange cake, moist and with natural aroma.' },
                        { name: 'Moist Chocolate Cake', price: 1500, image: '/assets/products/bolot26.png', isSpecial: true, desc: 'Intense chocolate flavor in an irresistibly moist batter.' },
                        { name: 'Red Velvet Cake', price: 1800, image: '/assets/products/bolo-t14.png', isSpecial: true, desc: 'Velvety cake with a hint of cocoa and creamy filling.' },
                        { name: 'Cheesecake (Strawberry/Passion Fruit)', price: 1600, image: '/assets/products/cakes.png', isSpecial: true, desc: 'Fresh and creamy dessert with selected fruit topping.' },
                        { name: 'Almond Tart', price: 1400, image: '/assets/products/fatias-xadrez.png', isSpecial: true, desc: 'Crispy base with a rich topping of toasted almonds.' },
                    ]
                },
                {
                    title: 'Savories',
                    items: [
                        { name: 'Shrimp Rissoles', price: 50, image: '/assets/products/rissois-camarao.png', desc: 'Crispy savory with creamy selected shrimp filling.' },
                        { name: 'Samosa meat/fish/chicken/cheese', price: 50, image: '/assets/products/chamussaS.png', desc: 'Crispy triangles with various fillings and special seasoning.' },
                        { name: 'Vegetable Samosa', price: 35, image: '/assets/products/chamussaS.png', desc: 'Delicious vegetarian option with fresh vegetables and spices.' },
                        { name: 'Coxinhas', price: 50, image: '/assets/products/coxinhas.png', desc: 'Potato dough filled with shredded and seasoned chicken.' },
                        { name: 'Mini pizza', price: 50, image: '/assets/products/mini-pizza.png', desc: 'Small in size but big in flavor, with cheese and tomato.' },
                        { name: 'Croquette', price: 50, image: '/assets/products/rissois-camarao.png', desc: 'Classic meat croquette with crispy exterior and soft interior.' },
                        { name: 'Potato Pies', price: 80, image: '/assets/products/folhados-carne.png', desc: 'Puff pastry filled with smooth and seasoned mashed potatoes.' },
                        { name: 'Chicken Pastry', price: 100, image: '/assets/products/folhado-salsicha.png', desc: 'Light puff pastry with juicy chicken filling.' },
                    ]
                },
                {
                    title: 'Breads',
                    items: [
                        { name: 'Loaf Bread (Large)', price: 60, image: '/assets/products/pao-forma-simples.png', desc: 'Soft loaf bread, ideal for family sandwiches.' },
                        { name: 'Loaf Bread (Small)', price: 30, image: '/assets/products/pao-forma-simples.png', desc: 'Compact version of our fresh loaf bread.' },
                        { name: 'Homemade Bread', price: 10, image: '/assets/products/pao-caseiro.png', desc: 'Our traditional rustic bread, made with love every day.' },
                        { name: 'Whole Wheat Bread', price: 12, image: '/assets/products/pao-integral.png', desc: 'Fiber-rich bread for a balanced breakfast.' },
                        { name: 'Whole Wheat Loaf', price: 15, image: '/assets/products/pao-forma-integral.png', desc: 'Individual whole wheat bread with dense and tasty texture.' },
                        { name: 'Burger/Hot Dog Bun', price: 15, image: '/assets/products/cachorro-quente.png', desc: 'Soft and sturdy bun, perfect for your snacks.' },
                        { name: 'Rye Bread', price: 35, image: '/assets/products/pao-cereais.png', desc: 'Authentic rye bread with robust and nutritious flavor.' },
                        { name: 'Cereal Bread', price: 40, image: '/assets/products/pao-cereais.png', desc: 'Multi-cereal bread with selected seeds for extra flavor.' },
                        { name: 'Large Whole Wheat Loaf', price: 80, image: '/assets/products/pao-forma-integral.png', desc: 'Large whole wheat loaf bread for the whole week.' },
                        { name: 'Small Whole Wheat Loaf', price: 40, image: '/assets/products/pao-forma-integral.png', desc: 'Practical whole wheat loaf bread for daily use.' },
                        { name: 'Water Bread', price: 8, image: '/assets/products/pao-caseiro.png', desc: 'Light and crispy bread, the perfect base for any meal.' },
                        { name: 'Water Bread (Small)', price: 5, image: '/assets/products/pao-caseiro.png', desc: 'Mini version of our always fresh water bread.' },
                        { name: 'Corn Bread (Broa)', price: 60, image: '/assets/products/broa-milho.png', desc: 'Dense and tasty, traditional Mozambican corn bread.' },
                        { name: 'Toast', price: 20, image: '/assets/products/sacos-de-torrada.png', desc: 'Crispy slices ready to accompany your tea or coffee.' },
                        { name: 'French Baguette', price: 70, image: '/assets/products/pao-portugues.png', desc: 'French-style baguette, crispy outside and soft inside.' },
                        { name: 'Cassete', price: 16, image: '/assets/products/pao-forma-simples.png', desc: 'Classic cassete bread, fluffy and ideal with butter.' },
                    ]
                },
                {
                    title: 'Snacks',
                    items: [
                        { name: 'Meat Shawarma', price: 350, image: '/assets/products/shawarma-de-frango.png', desc: 'Juicy spiced meat rolled in our flatbread.' },
                        { name: 'Chicken Shawarma', price: 300, image: '/assets/products/shawarma-de-frango.png', desc: 'Well-seasoned chicken, juicy and full of oriental flavor.' },
                        { name: 'Full Hot Dog', price: 300, image: '/assets/products/cachorro-quente.png', desc: 'The comforting snack packed with flavor and quality.' },
                        { name: 'Simple Hot Dog', price: 250, image: '/assets/products/cachorro-quente.png', desc: 'Simple, fast, and incredibly appetizing.' },
                        { name: 'Full Burger', price: 350, image: '/assets/products/hamburguer-completo.png', desc: 'The true giant of snacks, with flavor from the first to the last bite.' },
                        { name: 'Simple Burger', price: 300, image: '/assets/products/hamburguer-simples.png', desc: 'Juicy and tasty meat for those who prefer the classic.' },
                    ]
                },
                {
                    title: 'Extras',
                    items: [
                        { name: 'Mayonnaise', price: 30, image: '/assets/products/maionese.png', desc: 'Creamy and tasty, the final touch to your snacks.' },
                        {
                        name: 'French Fries',
                        price: 150,
                        desc: 'Crispy, golden, and freshly made.',
                        image: '/assets/products/batata-frita.png'
                    },
                    { name: 'Ketchup', price: 30, image: '/assets/products/ketchup.png', desc: 'The classic side that can never be missing.' },
                        { name: 'Spicy Sauce', price: 30, image: '/assets/products/molho-picante.png', desc: 'For those who like an extra touch of heat in their snack.' },
                    ]
                },
                {
                    title: 'Soft Drinks',
                    items: [
                        { name: 'Coca-Cola 300ml', price: 60, image: '/assets/products/coca-cola-300ml.png', desc: 'The cold classic beverage to share with your snack.' },
                        { name: 'Orange Fanta 300ml', price: 60, image: '/assets/products/fanta-laranja-300ml.png', desc: 'Citrusy and bubbly freshness to match your savory snacks.' },
                        { name: 'Sprite 300ml', price: 60, image: '/assets/products/sprite-300ml.png', desc: 'Refreshing, light, and lemon-flavored. Matches anything!' },
                        { name: 'Compal 300ml', price: 80, image: '/assets/products/compal-300ml.png', desc: 'Authentic fruit flavor, refreshing with every sip.' },
                        { name: 'Namaacha Water 500ml', price: 60, image: '/assets/products/agua-namaacha-500ml.png', desc: 'Refreshing, pure and local, straight to your bottle.' },
                    ]
                },
            ]
        },
        terms: {
            title: 'Terms of Service',
            subtitle: 'Pão Caseiro Bakery and Pastry (Mozambique)',
            section1Title: '1. Acceptance of Terms',
            section1Content: 'By accessing and using the Pão Caseiro website (paocaseiro.co.mz), you agree to comply with and be bound by these Terms of Service and all applicable laws and regulations in the Republic of Mozambique.',
            section2Title: '2. Orders and Payments',
            section2Content: 'All orders are subject to stock availability. Prices are indicated in Meticais (MZN) and include VAT at the legal rate in force. Payment must be made through the integrated mobile payment channels (M-Pesa, E-Mola, M-Kesh) or other methods explicitly accepted at checkout.',
            section3Title: '3. Deliveries and Quality',
            section3Content: 'Pão Caseiro commits to delivering fresh products within the agreed time. If any problem occurs with the quality or integrity of the product at the time of delivery, the customer must immediately report it to the delivery person or through our customer support channels.',
            section4Title: '4. User Responsibility',
            section4Content: 'The user is responsible for maintaining the confidentiality of their account and password. Any activity performed through your account will be your sole responsibility. Pão Caseiro reserves the right to refuse service or cancel accounts in case of misuse.',
            section5Title: '5. Order Cancellation Policy',
            section5Content: 'The customer has the right to request the cancellation of their order through their registration panel (Dashboard). Autonomous cancellation is only allowed if the order is still in the "Pending" status. Once it has transitioned to "In Preparation", the cancellation request must be forwarded to our support channels, and may be subject to retention of value for reasons of allocation of ingredients and labor already incurred to ensure our sustainability.',
            legalNoteTitle: 'Legal Note',
            legalNoteContent: 'These terms may be updated periodically to reflect changes in our services or legal requirements. We recommend frequent consultation of this page.'
        },
        privacy: {
            title: 'Privacy Policy',
            subtitle: 'Data Protection and Privacy',
            lastUpdate: 'Last update: 04/03/2026',
            section1Title: '1. Collection of Personal Data',
            section1Content: 'Pão Caseiro collects and stores the personal data provided (name, mobile phone, address, and email) only for the purpose of facilitating the ordering and delivery of our products, in addition to notifying customers about the status of their service.',
            section2Title: '2. Use and Sharing of Information',
            section2Content: 'All registered parties are preserved internally in the Pão Caseiro database. Your numbers and contact details are used exclusively for communications between the platform and the customer (OTP confirmation, order tracking) or promotional marketing campaigns for the shop itself.',
            guarantee: 'We guarantee that no data is rented, shared, or sold to third parties or external entities.',
            section3Title: '3. Protection and Security',
            section3Content: 'The database management is strictly performed by qualified Pão Caseiro administrators or IT affiliates, where consistent security measures are implemented according to the legal provisions applied in the Republic of Mozambique. We are the only entity managing and accessing the primary matrices of this data.',
            section4Title: '4. Customer Rights',
            section4Content: 'At any time as a free user of the platform, you can request detailed information about the information registered about you or totally erase your trace from our ecosystem, contacting our team management through the official Support Channels.',
            section5Title: '5. Cancellation Management (Logs)',
            section5Content: 'When an order is actively cancelled by the user in the Customer Dashboard, the operation is properly executed, stopping its progression. However, for reasons associated with security metrics, prevention of fraudulent behavior, and fiscal archiving, the metadata of cancelled orders moves to an inactive and secure (Read-Only) history, not being instantly deleted from the primary support tables.'
        }
    }
};
