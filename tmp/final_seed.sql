INSERT INTO public.products 
    (id, name, name_en, description, price, category, image, is_available, is_special, prep_time, delivery_time)
    VALUES 
    ('5eda6556-5a90-45cb-b166-4f8729568bda', 'Cakes / fatias', 'Generous slice of cake', 'Uma fatia do paraíso, perfeita para o seu café da tarde.', 150, 'Bolos & Sobremesas', '/images/cakes.png', true, false, NULL, NULL),
('72cd5159-5550-4f71-b052-1a4478a120a8', 'Fatias xadrez', 'Fun checkered cake', 'Estilo clássico em duas cores. Uma fatia nunca chega!', 150, 'Bolos & Sobremesas', '/images/fatias_xadrez.png', true, false, NULL, NULL),
('9eacccb1-bbfb-435b-9b87-67670cc4b93f', 'Mini folhados (kg)', 'Assortment of small puff pastries', 'Estaladiços e perfeitos para partilhar. O sucesso das suas festas!', 1000, 'Folhados & Salgados', '/images/mini_folhados.png', true, false, NULL, NULL),
('0bd962a7-8632-4590-a3d1-5fd5dab9c825', 'Folhados de carne', 'Puff pastry filled with meat', 'Recheio apurado envolvido num folhado que se desfaz na boca.', 100, 'Folhados & Salgados', '/images/folhados_carne.png', true, false, NULL, NULL),
('77acf4a7-17f5-41a4-8567-39a3c7741b68', 'Rolo de açúcar e canela', 'Sweet dough rolls', 'O aroma quente da canela numa massa incrivelmente fofa.', 80, 'Doces & Pastelaria', '/images/rolo_acucar_canela.png', true, false, NULL, NULL),
('3871c787-6dda-4e48-911a-ed1f102e0bbe', 'Batata Frita', 'French Fries', 'Crocantes, douradas e acabadas de fazer.', 150, 'Extras', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773945263090.png', true, false, NULL, NULL),
('5e9767b2-c34d-4c37-882c-d7e2364fa70a', 'Shawarma de carne', NULL, 'Carne suculenta com especiarias enrolada no nosso pão fino.', 350, 'Lanches', NULL, true, false, NULL, NULL),
('ccc0d7c1-1aff-4fad-b817-5308eca0ba11', 'Pão de Deus', 'Fluffy brioche bun with coconut', 'Pão brioche fofo com cobertura crocante de coco.', 60, 'Doces & Pastelaria', '/images/pao_deus.png', true, false, NULL, NULL),
('41e345ce-11dc-44f6-b7ef-1a8c88f942fa', 'Língua de Sogra', 'Long soft cake with cream', 'Massa leve coberta com creme doce. Prazer garantido!', 15, 'Doces & Pastelaria', '/images/lingua_sogra.png', true, false, NULL, NULL),
('73d83b0e-d1d8-418c-8948-db707aa99ac3', 'Bolo de arroz', 'Traditional rice flour muffin', 'Fofo, tradicional e com aquela crosta de açúcar irresistível.', 65, 'Bolos & Sobremesas', '/images/bolo_arroz.png', true, false, NULL, NULL),
('a223e442-3351-46a9-8447-7febbbd10e2b', 'Torta', 'Fluffy homemade pie/roll', 'Massa esponjosa enrolada com o nosso recheio tradicional.', 85, 'Bolos & Sobremesas', '/images/torta.png', true, false, NULL, NULL),
('69adfa7a-7274-4dc4-929b-5f28033906b1', 'Pão caseiro', 'Pão Caseiro', 'Cozido à lenha, fresco e com o sabor de casa.', 10, 'Pães', NULL, true, false, NULL, NULL),
('4ab73d68-d87e-4094-9b31-22e20e5046db', 'Pão integral', 'Rich in fiber', 'Mais fibras e muito sabor. O equilíbrio perfeito!', 12, 'Pães', '/images/pao_integral.png', true, false, NULL, NULL),
('5138c895-3f57-4d4d-aeb4-491a14c4c89c', 'Pão de forma integral', 'Ideal for balanced sandwiches', 'Torradas mais saudáveis para começar bem o dia.', 80, 'Pães', '/images/pao_forma_integral.png', true, false, NULL, NULL),
('82ca7eb5-a8ab-4ea4-9da3-a937fe4a8b83', 'Laços', 'Sugared puff pastry in a bow', 'Folhados açucarados com o toque caramelizado perfeito.', 60, 'Doces & Pastelaria', '/images/lacos.png', true, false, NULL, NULL),
('2f2f3817-e491-4199-a68f-aa433bf3b551', 'Compal 300ml', NULL, 'Sabor autêntico da fruta, refrescante a cada gole.', 80, 'Bebidas', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773955806396.jpg', true, false, NULL, NULL),
('36d0060d-4af7-484e-a106-0e47462cbbcd', 'Arrofadas 80g', NULL, 'A mesma maciez tradicional na medida certa.', 15, 'Pães', NULL, true, false, NULL, NULL),
('85d83f2f-96f6-430e-bb90-e2116ddd56b5', 'Pão português', 'Authentic Portuguese recipe', 'Aquele miolo denso e saboroso que a sua família adora.', 10, 'Pães', '/images/pao_portugues.png', true, false, NULL, NULL),
('95621337-b603-44f0-b76c-af779ee2da36', 'Sprite 300ml', NULL, 'Refrescante, leve e com sabor a limão. Combina com tudo!', 60, 'Bebidas', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773939500186.jpg', true, false, NULL, NULL),
('a24ac149-98ff-4b6f-b69c-e09a94f6b34e', 'Pudim', 'Smooth homemade egg pudding', 'Textura aveludada e caramelo rico. A sobremesa rainha!', 600, 'Bolos & Sobremesas', '/images/pudim.png', true, false, NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image = EXCLUDED.image,
    is_available = EXCLUDED.is_available,
    is_special = EXCLUDED.is_special,
    prep_time = EXCLUDED.prep_time,
    delivery_time = EXCLUDED.delivery_time;

INSERT INTO public.products 
    (id, name, name_en, description, price, category, image, is_available, is_special, prep_time, delivery_time)
    VALUES 
    ('e19dc905-a138-4408-88a7-0fe40d4e023f', 'Croissants recheados', 'Croissant with special filling', 'Folhado de manteiga com um recheio doce e cremoso.', 80, 'Folhados & Salgados', '/images/croissants_recheados.png', true, false, NULL, NULL),
('2156f9ef-ea8f-4ddb-a10b-820e6d898f45', 'Fanta laranja 300ml', NULL, 'Frescura cítrica e borbulhante para acompanhar os salgados.', 60, 'Bebidas', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773939329988.webp', true, false, NULL, NULL),
('742b663a-de7a-4d3c-b179-96a8adf306e0', 'Cachorro quente completo', 'Soft bun with sausage', 'O lanche reconfortante recheado de sabor e qualidade.', 300, 'Lanches', '/images/cachorro_quente.png', true, false, NULL, NULL),
('4efd78b1-7b62-4e65-952b-630c6de897da', 'Cupcake normal', NULL, 'Pequeno no tamanho, gigante no sabor. Fofo e delicioso!', 65, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('97cfacbd-8226-4e89-bba8-9170076f65f1', 'Lingua da sogra 80g', NULL, 'Versão perfeita do clássico para acompanhar uma bebida.', 15, 'Pães', NULL, true, false, NULL, NULL),
('55705e29-203f-4ca3-8cdb-78eb42f85b90', 'Mini pao de forma intergral 250g', NULL, 'Saudável e prático. Ideal para torradas crocantes!', 40, 'Pães', NULL, true, false, NULL, NULL),
('88b27a77-3944-411a-9fc9-7657e1e3e0ad', 'Salada Mista', 'Mixed Salad', 'Fresca, leve e crocante para equilibrar o seu prato.', 120, 'Extras', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773948027149.png', true, false, NULL, NULL),
('06166e1c-47fd-4312-8626-05dfba0d679d', 'Pizza de frango', NULL, 'Base estaladiça, queijo derretido e frango bem temperado.', 500, 'Pizzaria', NULL, true, false, NULL, NULL),
('2865b5d7-87b0-4bf4-8972-d1739f0a207a', 'Pao de forma cereais', NULL, 'Textura rica, sementes deliciosas e muita energia.', 50, 'Pães', NULL, true, false, NULL, NULL),
('f70a0463-c9a3-4cfa-8493-b66a78f7d867', 'Pao de deus', NULL, 'Massa brioche fofa coberta com uma generosa camada de coco.', 60, 'Pães', NULL, true, false, NULL, NULL),
('f7f8996e-f740-4278-87b7-57177be3c1e7', 'Maionese', 'Mayonnaise', 'Cremoso e saboroso, o toque final para os seus lanches.', 30, 'Extras', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773945221492.png', true, false, NULL, NULL),
('61df0ff9-353d-4ba2-a6b2-8218b952741e', 'Pastel de Nata', 'Portuguese classic: puff pastry', 'Creme divinal e massa folhada que estala a cada dentada. Único!', 80, 'Bolos & Sobremesas', '/images/pastel_nata.png', true, false, NULL, NULL),
('33de21b6-f241-48d9-96dc-b4fbe31e17c3', 'Pao caserio 100g', NULL, 'A frescura do nosso pão rei num tamanho ideal.', 10, 'Pães', NULL, true, false, NULL, NULL),
('45dbf704-d01d-4ded-bdd0-b014f68cff9e', 'Charruto recheado', NULL, 'Massa delicada a abraçar um recheio doce e cremoso.', 80, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('14df7d0f-55e0-4697-984b-d42538001028', 'Donuts', 'Fried doughnut', 'Massa dourada e cobertura deliciosa. Adoce o seu dia!', 80, 'Bolos & Sobremesas', '/images/donuts.png', true, false, NULL, NULL),
('b12a50c6-7a52-47e4-8ed3-b923022b3b14', 'Molho de Tomate', 'Tomato Sauce', 'Molho autêntico e rico em sabor para a sua refeição.', 30, 'Extras', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773945234917.png', true, false, NULL, NULL),
('86edfff1-20f3-4f4e-9328-81fe7c97ea8a', 'Pão de cereais (com sementes)', 'Healthy and nutritious bread', 'Energia e saúde numa fatia. Miolo rico e côdea crocante.', 25, 'Pães', '/images/pao_cereais.png', true, false, NULL, NULL),
('109cb833-4ada-4d2e-ac0e-8cb4a005497a', 'Arrofadas', 'Traditional sweet bread', 'O pão doce fofinho que derrete na boca. Sabor a infância!', 15, 'Doces & Pastelaria', '/images/arrofadas.png', true, false, NULL, NULL),
('60ea54cb-1f85-4cc0-a3d3-c0582abd4369', 'Queijo Extra', 'Extra Cheese', 'Para quem acredita que mais queijo é sempre mais felicidade!', 50, 'Extras', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773945251408.png', true, false, NULL, NULL),
('4c910222-b54f-41a3-b443-3c38a0908bbb', 'Pao normal 50g', NULL, 'Pão fresco e estaladiço, o clássico de todos os dias.', 5, 'Pães', NULL, true, false, NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image = EXCLUDED.image,
    is_available = EXCLUDED.is_available,
    is_special = EXCLUDED.is_special,
    prep_time = EXCLUDED.prep_time,
    delivery_time = EXCLUDED.delivery_time;

INSERT INTO public.products 
    (id, name, name_en, description, price, category, image, is_available, is_special, prep_time, delivery_time)
    VALUES 
    ('59dab69f-3fd1-4e41-9a20-5a9ed3124b42', 'Água Mineral', 'Mineral Water', 'Fresca e pura, a melhor companhia para qualquer prato.', 40, 'Extras', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773939553889.webp', true, false, NULL, NULL),
('5db4472f-2230-4686-9567-691b6e25aec2', 'Pizza mexicana', NULL, 'Um toque picante e vibrante para quem gosta de emoções fortes.', 500, 'Pizzaria', NULL, true, false, NULL, NULL),
('8ffd5e96-6e89-4295-ae79-3395b76c6821', 'Paozinho de leite 100g', NULL, 'O queridinho dos lanches, suave e fofinho.', 15, 'Pães', NULL, true, false, NULL, NULL),
('840110ed-8182-4c8d-96f6-ffc2e67ff8fd', 'Mini pizza', 'Small individual pizza', 'O sabor de Itália na dose certa para o seu lanche.', 50, 'Folhados & Salgados', '/images/pizza_mexicana.png', true, false, NULL, NULL),
('317b8b36-e275-4b88-8694-fd54be402450', 'Samosas / chamussas (50 cada)', 'Typical triangular pastry', 'Salgado icónico com recheio rico e tempero no ponto.', 50, 'Folhados & Salgados', '/images/samosas.png', true, false, NULL, NULL),
('fd7f6611-badb-4a7f-ac27-e0b007c01e1c', 'Sparletta 300Ml', NULL, 'A bebida refrescante perfeita para acompanhar o seu lanche.', 60, 'Bebidas', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773955782615.jpg', true, false, NULL, NULL),
('f5a6a97e-d7a0-473a-8e92-eafd419dcd39', 'Chamussas de peixe', NULL, 'Recheio saboroso do mar num triângulo crocante.', 40, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('7b3478b0-8b39-42c7-b830-1a2d1fc10019', 'Calzone', NULL, 'Uma pizza dobrada cheia de surpresas deliciosas no interior.', 80, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('54a31f78-87d6-4e2e-869d-1802113fad07', 'Folhado de salsicha', 'Tasty sausage wrapped in puff pastry', 'O casamento perfeito entre salsicha saborosa e massa dourada.', 70, 'Folhados & Salgados', '/images/folhado_salsicha.png', true, false, NULL, NULL),
('d01789e8-05ef-4f51-8b6e-8971bba3ab1b', 'Charuto', 'Rolled crispy pastry', 'Enroladinho doce e crocante. Impossível comer só um!', 80, 'Doces & Pastelaria', '/images/charuto.png', true, false, NULL, NULL),
('580aba0c-b437-4c18-af7e-d7e50aae4070', 'Pao portugues', NULL, 'Sabor rústico e autêntico de Portugal na sua mesa.', 20, 'Pães', NULL, true, false, NULL, NULL),
('2a24769d-bdba-4981-86ec-abe25dbcc0cf', 'Biscoitos amanteigados', NULL, 'Clássicos que se desfazem na boca a cada trinca.', 120, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('a7255785-3c6c-4d90-a934-a32e23bd8b86', 'Fatias normal', NULL, 'O sabor genuíno de um bolo perfeito para partilhar no café.', 150, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('8c7bfbb9-6c04-4ac5-8504-c558c159f379', 'Empada de carne', NULL, 'Carne apurada numa massinha que derrete na boca.', 100, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('3eef872a-aabf-4dbd-a6ed-67ba256d7d48', 'Pizza de atum', NULL, 'Frescura do mar mergulhada em queijo derretido e base fina.', 500, 'Pizzaria', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773952990615.png', true, false, NULL, NULL),
('7e5e001c-1dec-4e26-a60a-6033ca7ae3ac', 'Empadas de frango', NULL, 'Tenras, saborosas e impossíveis de comer só uma!', 100, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('a3ab8880-e305-4937-bb77-3cad3e3dcfc8', 'Rissois', NULL, 'O salgado que é rei em Moçambique, panado e divinal!', 50, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('5b0670cb-435c-4ff2-b137-c18742929753', 'Coca-cola 300ml', NULL, 'A bebida clássica geladinha para partilhar com o seu lanche.', 60, 'Bebidas', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773939270367.webp', true, false, NULL, NULL),
('f5ddc8e1-b9f5-4f42-a954-f5a6c4a5b706', 'Água da namaacha 500ml', NULL, 'Refrescante, pura e local, direta para a sua garrafa.', 60, 'Bebidas', 'https://bbvowyztvzselxphbqmt.supabase.co/storage/v1/object/public/products/1773939541938.webp', true, false, NULL, NULL),
('d70e21f1-22fe-4be7-b4ec-d632fea72649', 'Waffle Stick', 'Delicious waffle on a stick', 'A alegria num palito! Crocante por fora, macio por dentro.', 200, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image = EXCLUDED.image,
    is_available = EXCLUDED.is_available,
    is_special = EXCLUDED.is_special,
    prep_time = EXCLUDED.prep_time,
    delivery_time = EXCLUDED.delivery_time;

INSERT INTO public.products 
    (id, name, name_en, description, price, category, image, is_available, is_special, prep_time, delivery_time)
    VALUES 
    ('da6ac110-e22a-4a65-93a4-4f41b51db125', 'Pao de cereais c/ sementes', NULL, 'Rico em cereais e fibras para um pequeno-almoço nutritivo.', 40, 'Pães', NULL, true, false, NULL, NULL),
('2e361d92-2071-4ad9-8afd-fb25276ee2b8', 'Chamussas de frango', NULL, 'O clássico recheio de frango envolvido em massa crocante.', 50, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('fa336c40-04d7-440a-ae18-1d67b69d9711', 'Queques', 'Simple and fluffy individual cake', 'Simples, amarelinho e fofinho. O lanche ideal para os miúdos!', 65, 'Bolos & Sobremesas', '/images/queques.png', true, false, NULL, NULL),
('23be2a43-3acd-4109-a2a6-50d1e72b974d', 'Chamussas de vegetais', NULL, 'Opção leve e estaladiça com vegetais refogados no ponto.', 40, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('891d402b-cdad-477c-9773-dc580b73912a', 'Palmier recheado', 'Two layers of palmier', 'Dois corações de massa folhada a envolver creme divinal.', 100, 'Bolos & Sobremesas', '/images/palmier_recheado.png', true, false, NULL, NULL),
('043d7f0a-f1e8-44d7-8aa8-3b97290bdd26', 'Folhado recheado', NULL, 'Massa leve a abraçar as melhores combinações de sabores.', 80, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('27a460dd-85ac-431b-841d-99cb78a6a922', 'Pao de forma 500g', NULL, 'Fatias macias para lanches maravilhosos durante a semana.', 60, 'Pães', NULL, true, false, NULL, NULL),
('2519d1e7-f9f2-490e-be48-78e1985c0211', 'Hambúrguer completo', NULL, 'O verdadeiro gigante dos lanches, com sabor do primeiro ao último trinca.', 350, 'Lanches', NULL, true, false, NULL, NULL),
('8136d60c-5641-429b-a41e-af39ecbb0e0a', 'Café espresso', NULL, 'A injeção de energia com o aroma mais intenso.', 100, 'Cafés', NULL, true, false, NULL, NULL),
('5384d1eb-67d4-44ae-827d-60a9e1895c20', 'Café especial', NULL, 'Um toque gourmet que transforma o seu momento de café.', 150, 'Cafés', NULL, true, false, NULL, NULL),
('325cb616-dfec-4d91-9a37-a85025ea82e5', 'Pao de forma integral 500g', NULL, 'A alternativa saudável e cheia de sabor para a sua família.', 80, 'Pães', NULL, true, false, NULL, NULL),
('45fc1b16-2e22-47a4-a626-082a2336f451', 'Shawarma de galinha', NULL, 'Frango bem temperado, suculento e cheio de sabor oriental.', 300, 'Lanches', NULL, true, false, NULL, NULL),
('2809990d-b43e-400c-a53b-33f2bc751d59', 'Cappuccino', NULL, 'Equilíbrio perfeito de café, leite e uma espuma aveludada.', 200, 'Cafés', NULL, true, false, NULL, NULL),
('aa39b30b-6099-44fe-afef-fc1a83fca739', 'Cachorro quente', NULL, 'Simples, rápido e incrivelmente apetitoso.', 250, 'Lanches', NULL, true, false, NULL, NULL),
('8f1a089e-939c-4bfc-a0b7-9eed56e22708', 'Rissóis de camarão', 'Breaded crescent pastry', 'Cremosos por dentro, estaladiços por fora. Irresistíveis!', 50, 'Folhados & Salgados', '/images/rissois_camarao.png', true, false, NULL, NULL),
('e0d7fc63-80c5-4322-9574-ab78318cb908', 'Broa de milho', 'Dense and tasty cornbread', 'Densa, autêntica e perfeita com uma boa manteiga derretida.', 60, 'Pães', '/images/broa_milho.png', true, false, NULL, NULL),
('4bcef7cc-b2d2-4cfa-888f-9242ca882a1c', 'Pao caseiro grande', NULL, 'O coração da nossa padaria, perfeito para a mesa de domingo.', 40, 'Pães', NULL, true, false, NULL, NULL),
('a24da823-ab58-4ae4-98e4-654a09f8fe11', 'Empadas', 'Tender shortcrust pastry', 'Massa quebrada tenra a esconder um recheio reconfortante.', 100, 'Folhados & Salgados', '/images/empadas.png', true, false, NULL, NULL),
('1ab63a1d-3a43-4f07-8038-32e33a0ae03e', 'Pizza 4 estacões', NULL, 'Cor, variedade e frescura sobre uma base fantástica.', 500, 'Pizzaria', NULL, true, false, NULL, NULL),
('d767d587-6312-4618-bb1d-9c08feb5ec9e', 'Pasteis de coco', NULL, 'O inconfundível sabor a coco numa receita tradicional de lamber os dedos.', 80, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image = EXCLUDED.image,
    is_available = EXCLUDED.is_available,
    is_special = EXCLUDED.is_special,
    prep_time = EXCLUDED.prep_time,
    delivery_time = EXCLUDED.delivery_time;

INSERT INTO public.products 
    (id, name, name_en, description, price, category, image, is_available, is_special, prep_time, delivery_time)
    VALUES 
    ('ac9c0079-7545-4a9a-9407-3bc31a41e34d', 'Hambúrguer simples', NULL, 'Carne suculenta e saborosa para quem prefere o clássico.', 300, 'Lanches', NULL, true, false, NULL, NULL),
('0f09c214-0f97-4d02-a156-5f5f3e1b9f4c', 'Pao de humbuger/ cachoro', NULL, 'Macio e resistente, a base perfeita para as suas criações.', 15, 'Pães', NULL, true, false, NULL, NULL),
('8e33f756-da9d-4492-9afe-30bf083fe01f', 'Pao integral peq', NULL, 'A sua dose diária de fibras e saúde num formato prático.', 10, 'Pães', NULL, true, false, NULL, NULL),
('a37f1ee6-7a70-4406-9b49-a61ade6fee1e', 'Bola de Berlim', 'Fluffy fried dough', 'Massa fofíssima, açúcar e muito recheio que nos transporta ao Éden!', 80, 'Bolos & Sobremesas', '/images/bola_berlim.png', true, false, NULL, NULL),
('8fb4839c-23c4-4c46-90f7-3e95b5bae830', 'Nevada', 'Fluffy cake with white cream', 'Uma autêntica nuvem de doçura com um toque especial de coco.', 80, 'Bolos & Sobremesas', '/images/nevada.png', true, false, NULL, NULL),
('4892e17d-7861-4fab-b9be-cc50b2cc838e', 'Coxinhas', 'Traditional savory dough', 'Massa dourada e recheio cremoso. Sempre uma boa escolha!', 50, 'Folhados & Salgados', '/images/coxinhas.png', true, false, NULL, NULL),
('9df2ba66-4782-4ae3-97fe-aff661e56e77', 'Croisant simples', NULL, 'A realeza da pastelaria: massa folhada rica em manteiga.', 60, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('ee471e5b-b834-473e-9c62-679acad8464d', 'Guardanapo recheado c/ creme', NULL, 'Massa fofa e úmida envolvida em muito amor e creme.', 150, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('767cbf99-9f6e-456e-a26e-6ea83035f901', 'Bolo t22', NULL, 'O meio termo dourado para tornar eventos inesquecíveis.', 1850, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('1a606ba2-a1dd-420b-8299-5e0b032f0b9c', 'King pie frango/carne', NULL, 'Um verdadeiro rei! Massa perfeita com um recheio farto.', 100, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('f081e2dc-7e09-43f1-920b-7836f9838756', 'Pie de vegetais', NULL, 'Uma escolha saborosa e crocante cheia de vegetais nutritivos.', 100, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('96af6933-0d32-44e3-abf5-1d4c0b7cbda2', 'Chá de leite', NULL, 'Quente e reconfortante, o clássico chá que relaxa a alma.', 150, 'Chás', NULL, true, false, NULL, NULL),
('0222c76b-b897-4982-b466-b1239acf980d', 'Hot chocolate', NULL, 'O abraço quente e achocolatado perfeito para dias frios.', 200, 'Cafés', NULL, true, false, NULL, NULL),
('b072995f-489b-4e32-830d-9308a2df309a', 'Chá especial', NULL, 'Infusão delicada de aromas selecionados para recarregar as energias.', 80, 'Chás', NULL, true, false, NULL, NULL),
('869c358a-647e-49e1-8b07-bc89d947cd27', 'Bolo t14', NULL, 'Ideal para celebrar em família. Massa fresca e fofa!', 750, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('0c85dcd6-99ea-4ceb-b6dd-acacb042a98d', 'Chá simples', NULL, 'O toque quente e suave para qualquer momento do dia.', 70, 'Chás', NULL, true, false, NULL, NULL),
('98919d62-5f7a-438e-a94f-ff57fa06e3de', 'Bolo t18', NULL, 'Sabor de festa com o equilíbrio doce perfeito para partilhar.', 1350, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('fadee8ae-c016-49bf-a728-108e056e0dda', 'Brioche de frutas', NULL, 'Fruta cristalizada na massa fofa que é uma verdadeira delícia festiva.', 80, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('c35a769d-4350-4aac-bc32-1c6a6eeb0e05', 'Saco de torrada', NULL, 'Nunca falta pão estaladiço para o seu pequeno almoço!', 20, 'Pães', NULL, true, false, NULL, NULL),
('208b25fa-c83e-4aa0-bb7b-c96501ed3fd7', 'Bolo t26', NULL, 'A estrela grande da sua festa, feito como antigamente.', 2500, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image = EXCLUDED.image,
    is_available = EXCLUDED.is_available,
    is_special = EXCLUDED.is_special,
    prep_time = EXCLUDED.prep_time,
    delivery_time = EXCLUDED.delivery_time;

INSERT INTO public.products 
    (id, name, name_en, description, price, category, image, is_available, is_special, prep_time, delivery_time)
    VALUES 
    ('19e750d9-aa0d-4106-9cf9-a6a05fd9341a', 'Croisant recheado', NULL, 'O sabor sublime do croissant com uma doce surpresa no meio.', 80, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('b633532a-496e-4fb1-88cd-d4db363d10af', 'Palmier simples', NULL, 'Crocante, caramelizado e sempre uma ótima escolha.', 50, 'Bolos & Sobremesas', NULL, true, false, NULL, NULL),
('85032795-2edf-45f2-9c07-dd96a6cfa872', 'Mini subs', NULL, 'O lanche equilibrado para qualquer hora e em qualquer lugar.', 60, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('f0cd34b2-75c4-40c3-91c2-8f506983cd64', 'Folhados recheados', 'Variety of puff pastries', 'A crocância de fora unida à explosão de sabor interior.', 80, 'Folhados & Salgados', '/images/folhados_recheados.png', true, false, NULL, NULL),
('a6e525d5-34b6-4cfb-8248-1a3b27b71ed9', 'Croissants folhados', 'Classic puff pastry croissant', 'Visual atrativo e textura estaladiça que eleva a fasquia.', 80, 'Folhados & Salgados', '/images/croissants_folhados.png', true, false, NULL, NULL),
('5fc8cb87-91cd-4bc3-9e66-c10e2a1490c9', 'Café gelado', NULL, 'O sabor intenso do café combinado com a frescura do gelo.', 150, 'Cafés', NULL, true, false, NULL, NULL),
('90214297-434b-46a7-b807-8234359eaa1b', 'Pizza de peperoni', NULL, 'O clássico irrepreensível: salame picante e muito queijo!', 500, 'Pizzaria', NULL, true, false, NULL, NULL),
('d5bad37a-4b01-41c2-864d-2a3c4e577ce7', 'Folhados de salchicha', NULL, 'Clássico intemporal que nunca falha no sabor.', 70, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('c85fae55-e9f9-4be4-9243-32cf8686a3fd', 'Chamussas de carne', NULL, 'A crocância envolta numa carne bem temperada e de lamber os dedos.', 50, 'Folhados & Salgados', NULL, true, false, NULL, NULL),
('de3c0c51-ddf3-4abb-b830-afb3d710ecc4', 'Pão de forma simples', 'Soft and fluffy', 'A base macia e branca que transforma as sandes.', 60, 'Pães', '/images/pao_forma_simples.png', true, false, NULL, NULL),
('e2bf3f8f-8cfd-48d4-965b-6a154acd063d', 'Folhado salsicha com queijo', 'Classic sausage puff pastry', 'O par perfeito, abraçado por um rico creme e massa folhada.', 70, 'Folhados & Salgados', '/images/folhado_salsicha_queijo.png', true, false, NULL, NULL),
('00ef6827-e6dd-454d-b6d8-a3e8f6c13741', 'Croissants simples', 'Brioche-style croissant', 'Amanteigados, levíssimos e folhados na perfeição.', 60, 'Folhados & Salgados', '/images/croissants_simples.png', true, false, NULL, NULL),
('85db6dfe-ccb5-4291-9b41-dd61d8e47cc3', 'Croissants chocolate', 'Filled with chocolate cream', 'O sonho feito de massa folhada e puro chocolate derretido.', 80, 'Folhados & Salgados', '/images/croissants_chocolate.png', true, false, NULL, NULL),
('f14dc172-39c2-410e-b4c4-63ac23383330', 'Pao normal 80g', NULL, 'A côdea estaladiça e o miolo macio numa porção generosa.', 8, 'Pães', NULL, true, false, NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image = EXCLUDED.image,
    is_available = EXCLUDED.is_available,
    is_special = EXCLUDED.is_special,
    prep_time = EXCLUDED.prep_time,
    delivery_time = EXCLUDED.delivery_time;