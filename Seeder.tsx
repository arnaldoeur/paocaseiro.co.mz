import React, { useState } from 'react';
import { supabase } from './services/supabase';
import { translations } from './translations';

export const Seeder: React.FC = () => {
    const [status, setStatus] = useState('Ready to seed');
    const [log, setLog] = useState<string[]>([]);

    const seedProducts = async () => {
        setStatus('Seeding...');
        setLog([]);
        const products = translations.pt.menu.sections.flatMap(section =>
            section.items.map(item => ({
                category: section.title,
                name: item.name,
                price: item.price,
                description: item.desc,
                image_url: item.image,
                is_available: true,
                stock_quantity: 100, // Default stock
                variations: item.variations || []
            }))
        );

        for (const p of products) {
            try {
                // 1. Insert Product
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .insert({
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        category: p.category,
                        image_url: p.image_url,
                        stock_quantity: p.stock_quantity,
                        is_available: true
                    })
                    .select()
                    .single();

                if (productError) throw productError;

                setLog(prev => [...prev, `Added: ${p.name}`]);

                // 2. Insert Variations if any
                if (p.variations && p.variations.length > 0) {
                    const variations = p.variations.map(v => ({
                        product_id: productData.id,
                        name: v.name,
                        price: v.price,
                        stock_quantity: 50
                    }));

                    const { error: varError } = await supabase
                        .from('product_variations')
                        .insert(variations);

                    if (varError) throw varError;
                    setLog(prev => [...prev, `  > Added ${p.variations.length} variations for ${p.name}`]);
                }

            } catch (err: any) {
                console.error(err);
                setLog(prev => [...prev, `ERROR adding ${p.name}: ${err.message}`]);
            }
        }
        setStatus('Finished Seeding!');
    };

    return (
        <div className="p-10 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Database Seeder</h1>
            <button
                onClick={seedProducts}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold shadow-lg"
            >
                START SEEDING
            </button>
            <p className="mt-4 font-bold">Status: {status}</p>
            <div className="mt-4 bg-black text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-xs">
                {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
};
