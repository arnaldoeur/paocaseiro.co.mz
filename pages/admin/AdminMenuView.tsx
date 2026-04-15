import React, { useState, useEffect } from 'react';
import { Download, Eye, EyeOff, ChevronDown, Loader, BookOpen, Package, Filter, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    description?: string;
    image_url?: string;
    inStock?: boolean;
    showInMenu?: boolean;
    internal_id?: string;
}

interface AdminMenuViewProps {
    products: Product[];
    companyInfo?: {
        name?: string;
        phone?: string;
        address?: string;
        slogan?: string;
        logo?: string;
        website?: string;
    };
}

// ─── Brand Tokens ────────────────────────────────────────────
const BROWN = [59, 47, 47] as const;
const GOLD = [217, 166, 90] as const;
const CREAM = [253, 246, 238] as const;
const WHITE = [255, 255, 255] as const;
const DARK = [40, 28, 24] as const;

// ─── Helper: load image as base64 ───────────────────────────
const toBase64 = (url: string): Promise<string> =>
    new Promise(resolve => {
        if (!url) return resolve('');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || 400; c.height = img.naturalHeight || 400;
                const ctx = c.getContext('2d');
                if (ctx) { ctx.drawImage(img, 0, 0); resolve(c.toDataURL('image/jpeg', 0.9)); }
                else resolve('');
            } catch { resolve(''); }
        };
        img.onerror = () => resolve('');
        img.src = url;
    });

const toBase64PNG = (url: string): Promise<string> =>
    new Promise(resolve => {
        if (!url) return resolve('');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || 400; c.height = img.naturalHeight || 400;
                const ctx = c.getContext('2d');
                if (ctx) { ctx.drawImage(img, 0, 0); resolve(c.toDataURL('image/png')); }
                else resolve('');
            } catch { resolve(''); }
        };
        img.onerror = () => resolve('');
        img.src = url;
    });

// ─── Category Colors ─────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
    'Bebidas': '#0891b2', 'Pães': '#d97706', 'Bolos & Sobremesas': '#9333ea',
    'Doces & Pastelaria': '#e11d48', 'Folhados & Salgados': '#16a34a',
    'Lanches': '#ea580c', 'Cafés': '#92400e', 'Chás': '#15803d',
    'Extras': '#6366f1', 'Pizzaria': '#dc2626',
};
const getCatColor = (cat: string) => CAT_COLORS[cat] || '#d9a65a';

// ─── Draw rounded rect helper ─────────────────────────────────
function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: string = 'FD') {
    doc.roundedRect(x, y, w, h, r, r, style);
}

// ─── PDF Generation ───────────────────────────────────────────
async function buildMenuPDF(
    visibleProducts: Product[],
    groupedByCategory: Record<string, Product[]>,
    brand: { name: string; slogan: string; phone: string; email?: string; address: string; website: string; logo?: string },
    categoryFilter?: string
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297;

    // ══════════════════════════════════════════════════
    // PAGE 1 — PREMIUM COVER
    // ══════════════════════════════════════════════════

    // Full dark background
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, PH, 'F');

    // Top gold bar
    doc.setFillColor(...GOLD);
    doc.rect(0, 0, PW, 10, 'F');

    // Bottom gold strip accent
    doc.setFillColor(...GOLD);
    doc.rect(0, PH - 10, PW, 10, 'F');

    // Side accent lines (decorative)
    doc.setFillColor(217, 166, 90);
    doc.rect(0, 10, 3, PH - 20, 'F');
    doc.rect(PW - 3, 10, 3, PH - 20, 'F');

    // LOGO circle area
    const cx = PW / 2, cy = 115;
    // Outer gold ring
    doc.setFillColor(180, 130, 55);
    doc.circle(cx, cy, 62, 'F');
    // Inner cream circle
    doc.setFillColor(255, 248, 235);
    doc.circle(cx, cy, 59, 'F');

    // Logo image — try absolute URL based on window.location
    const logoAbsUrl = `${window.location.origin}/logo_white.png`;
    const logoData = await toBase64PNG(logoAbsUrl);
    if (logoData) {
        try {
            doc.addImage(logoData, 'PNG', cx - 48, cy - 48, 96, 96, undefined, 'FAST');
        } catch (_) {
            // fallback: text
            doc.setTextColor(...GOLD);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text(brand.name, cx, cy, { align: 'center' });
        }
    } else {
        doc.setTextColor(...GOLD);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(brand.name, cx, cy, { align: 'center' });
    }

    // Brand name
    doc.setTextColor(...GOLD);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(brand.name.toUpperCase(), cx, 193, { align: 'center' });

    // Gold divider line
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);
    doc.line(cx - 50, 198, cx + 50, 198);

    // Slogan (ASCII-safe encoding)
    const slogan = (brand.slogan || 'O Sabor que Aquece o Coracao')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip diacritics for jsPDF safety
    doc.setTextColor(220, 195, 140);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text(`"${slogan}"`, cx, 208, { align: 'center' });

    // CARDAPIO pill badge
    const menuLabel = categoryFilter
        ? categoryFilter.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : 'CARDAPIO COMPLETO';
    const pillW = Math.min(doc.getTextWidth(menuLabel) + 20, 100);
    const pillX = cx - pillW / 2, pillY = 217;
    doc.setFillColor(...GOLD);
    doc.roundedRect(pillX, pillY, pillW, 13, 6, 6, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(menuLabel, cx, pillY + 8.5, { align: 'center' });

    // Date
    const dateStr = new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setTextColor(140, 120, 90);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, cx, 238, { align: 'center' });

    // Bottom bar with contacts
    doc.setFillColor(55, 40, 35);
    doc.rect(0, PH - 38, PW, 28, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, PH - 38, PW, 2, 'F');

    const contactParts: string[] = [];
    if (brand.phone) contactParts.push(`Tel: ${brand.phone}`);
    if (brand.address) contactParts.push(brand.address);
    if (brand.website) contactParts.push(brand.website);
    if (contactParts.length > 0) {
        doc.setTextColor(...GOLD);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(contactParts.join('   |   '), cx, PH - 24, { align: 'center', maxWidth: PW - 20 });
    }
    doc.setTextColor(170, 145, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Todos os precos em Meticais (MT) - Sujeito a alteracoes sem aviso previo', cx, PH - 16, { align: 'center' });

    // ══════════════════════════════════════════════════
    // PRODUCT PAGES — KFC-style 3-column grid
    // ══════════════════════════════════════════════════
    const catsToRender = categoryFilter
        ? { [categoryFilter]: groupedByCategory[categoryFilter] || [] }
        : groupedByCategory;

    const COLS = 3;
    const CELL_W = 58;
    const CELL_H = 62;  // taller to fit description
    const GAP_X = 5;
    const GAP_Y = 4;
    const START_X = 12;

    // Layout constants
    const FIRST_PAGE_START_Y = 76;  // after category header
    const CONT_PAGE_START_Y  = 24;  // after compact header on continuation pages
    const FIRST_PAGE_ROWS = 3;      // 9 items on first category page
    const CONT_PAGE_ROWS  = 4;      // 12 items on continuation pages

    const drawPageFooter = () => {
        doc.setFillColor(...DARK);
        doc.rect(0, PH - 12, PW, 12, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(0, PH - 12, PW, 1.5, 'F');
        
        const footerInfo = [];
        if (brand.phone) footerInfo.push(`Tel: ${brand.phone}`);
        if (brand.email) footerInfo.push(brand.email);
        if (brand.website) footerInfo.push(brand.website);
        if (brand.address) footerInfo.push(brand.address);
        
        const fp = footerInfo.join('  |  ');
        if (fp) {
            doc.setTextColor(180, 155, 110);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.text(fp, PW / 2, PH - 5, { align: 'center' });
        }
    };

    for (const [cat, prods] of Object.entries(catsToRender)) {
        if (!prods || prods.length === 0) continue;

        // ── First page of this category ──
        doc.addPage();
        doc.setFillColor(...CREAM);
        doc.rect(0, 0, PW, PH, 'F');

        // Category header
        doc.setFillColor(...DARK);
        doc.rect(0, 0, PW, 32, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(0, 0, PW, 4, 'F');

        doc.setTextColor(...GOLD);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(brand.name.toUpperCase(), 14, 18);

        const catLabelRaw = cat.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const catW = doc.getTextWidth(catLabelRaw) + 12;
        doc.setFillColor(...GOLD);
        doc.roundedRect(PW - 14 - catW, 10, catW, 12, 2, 2, 'F');
        doc.setTextColor(...DARK);
        doc.setFontSize(8);
        doc.text(catLabelRaw, PW - 14 - catW / 2, 18, { align: 'center' });

        // Category title
        const catNameSafe = cat.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        doc.setTextColor(...DARK);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(catNameSafe, 14, 50);

        doc.setDrawColor(...GOLD);
        doc.setLineWidth(2);
        doc.line(14, 54, Math.min(14 + doc.getTextWidth(catNameSafe) + 6, 100), 54);

        // Count badge
        doc.setFillColor(...GOLD);
        doc.roundedRect(14, 57, 42, 9, 2, 2, 'F');
        doc.setTextColor(...DARK);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${prods.length} ${prods.length === 1 ? 'PRODUTO' : 'PRODUTOS'}`, 35, 63.5, { align: 'center' });

        // Draw products across multiple pages as needed
        let contPageCount = 0;
        let onContPage = false;

        for (let i = 0; i < prods.length; i++) {
            const product = prods[i];
            const maxOnFirstPage = COLS * FIRST_PAGE_ROWS; // 9

            let col: number, row: number, xPos: number, yPos: number;

            if (i < maxOnFirstPage) {
                // First category page
                if (onContPage) {
                    doc.addPage();
                    doc.setFillColor(...CREAM);
                    doc.rect(0, 0, PW, PH, 'F');
                    onContPage = false;
                }
                col = i % COLS;
                row = Math.floor(i / COLS);
                xPos = START_X + col * (CELL_W + GAP_X);
                yPos = FIRST_PAGE_START_Y + row * (CELL_H + GAP_Y);
            } else {
                // Continuation pages
                const overflowIdx = i - maxOnFirstPage;
                const whichContPage = Math.floor(overflowIdx / (COLS * CONT_PAGE_ROWS));
                const posOnPage = overflowIdx % (COLS * CONT_PAGE_ROWS);

                if (posOnPage === 0) {
                    // Need a new page
                    doc.addPage();
                    doc.setFillColor(...CREAM);
                    doc.rect(0, 0, PW, PH, 'F');
                    // Compact header
                    doc.setFillColor(...DARK);
                    doc.rect(0, 0, PW, 18, 'F');
                    doc.setFillColor(...GOLD);
                    doc.rect(0, 0, PW, 2.5, 'F');
                    doc.setTextColor(...GOLD);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(brand.name.toUpperCase(), 14, 12);
                    doc.setTextColor(200, 175, 130);
                    doc.text(catLabelRaw, PW - 14, 12, { align: 'right' });
                    contPageCount++;
                }

                col = posOnPage % COLS;
                row = Math.floor(posOnPage / COLS);
                xPos = START_X + col * (CELL_W + GAP_X);
                yPos = CONT_PAGE_START_Y + row * (CELL_H + GAP_Y);
            }

            // ── Product card ──
            // Card background without bold border
            doc.setFillColor(...WHITE);
            doc.roundedRect(xPos, yPos, CELL_W, CELL_H, 3, 3, 'F');

            // Clickable link for the product
            doc.link(xPos, yPos, CELL_W, CELL_H, { url: `${window.location.origin}/?product=${product.id}` });

            const IMG_H = 30;

            if (product.image_url) {
                const imgData = await toBase64(product.image_url);
                if (imgData) {
                    doc.setFillColor(252, 250, 246);
                    doc.roundedRect(xPos, yPos, CELL_W, IMG_H, 3, 0, 'F');
                    try {
                        doc.addImage(imgData, 'JPEG', xPos, yPos, CELL_W, IMG_H, undefined, 'FAST');
                    } catch (_) { /* skip if image fails */ }
                } else {
                    doc.setFillColor(252, 250, 246);
                    doc.roundedRect(xPos, yPos, CELL_W, IMG_H, 3, 0, 'F');
                    doc.setTextColor(200, 175, 130);
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'normal');
                    doc.text('sem foto', xPos + CELL_W / 2, yPos + IMG_H / 2, { align: 'center' });
                }
            } else {
                doc.setFillColor(252, 250, 246);
                doc.roundedRect(xPos, yPos, CELL_W, IMG_H, 3, 0, 'F');
                doc.setTextColor(200, 165, 100);
                doc.setFontSize(6);
                doc.setFont('helvetica', 'normal');
                doc.text('Pao Caseiro', xPos + CELL_W / 2, yPos + IMG_H / 2, { align: 'center' });
            }

            // Gold separator
            doc.setDrawColor(...GOLD);
            doc.setLineWidth(0.5);
            doc.line(xPos + 3, yPos + IMG_H, xPos + CELL_W - 3, yPos + IMG_H);

            // Product name
            const nameSafe = product.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            doc.setTextColor(...DARK);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            const nameLines = doc.splitTextToSize(nameSafe, CELL_W - 6);
            doc.text(nameLines.slice(0, 2), xPos + CELL_W / 2, yPos + IMG_H + 5, { align: 'center' });

            // Description (italic, grey, truncated to 2 lines)
            if (product.description) {
                const descSafe = product.description.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                doc.setTextColor(110, 95, 85);
                doc.setFontSize(5.5);
                doc.setFont('helvetica', 'italic');
                const descLines = doc.splitTextToSize(descSafe, CELL_W - 6);
                doc.text(descLines.slice(0, 2), xPos + CELL_W / 2, yPos + IMG_H + 11.5, { align: 'center', lineHeightFactor: 1.2 });
            }

            // Price badge
            const priceStr = `${product.price.toFixed(2)} MT`;
            doc.setFillColor(...DARK);
            doc.roundedRect(xPos + 5, yPos + CELL_H - 10, CELL_W - 10, 8, 2, 2, 'F');
            doc.setTextColor(...GOLD);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text(priceStr, xPos + CELL_W / 2, yPos + CELL_H - 5, { align: 'center' });
        }

        drawPageFooter();
    }

    // Save
    const fname = categoryFilter
        ? `pao_caseiro_menu_${categoryFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
        : `pao_caseiro_cardapio_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fname);
}


// ─── Main Component ───────────────────────────────────────────
export const AdminMenuView: React.FC<AdminMenuViewProps> = ({ products, companyInfo }) => {
    const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingLabel, setGeneratingLabel] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Sync when products load
    useEffect(() => {
        if (!products || products.length === 0) return;
        setMenuVisibility(prev => {
            const updated = { ...prev };
            products.forEach(p => {
                if (updated[p.id] === undefined) {
                    updated[p.id] = p.showInMenu !== false;
                }
            });
            return updated;
        });
    }, [products]);

    const visibleProducts = products.filter(p => menuVisibility[p.id] !== false);

    const groupedByCategory = visibleProducts.reduce<Record<string, Product[]>>((acc, p) => {
        const cat = p.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});

    const allGrouped = products.reduce<Record<string, Product[]>>((acc, p) => {
        const cat = p.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});

    const uniqueCategories = ['all', ...Array.from(new Set(products.map(p => p.category || 'Outros')))];

    const filteredProducts = selectedCategory === 'all' ? visibleProducts
        : visibleProducts.filter(p => (p.category || 'Outros') === selectedCategory);

    const filteredGrouped = selectedCategory === 'all'
        ? groupedByCategory
        : Object.fromEntries(Object.entries(groupedByCategory).filter(([cat]) => cat === selectedCategory));

    const toggleVisibility = (id: string) =>
        setMenuVisibility(prev => ({ ...prev, [id]: !(prev[id] !== false) }));

    const brand = {
        name: companyInfo?.name || 'Pão Caseiro',
        slogan: companyInfo?.slogan || 'O Sabor que Aquece o Coração',
        phone: companyInfo?.phone || '',
        address: companyInfo?.address || '',
        website: companyInfo?.website || '',
        logo: companyInfo?.logo || undefined,
    };

    const handleGeneratePDF = async (categoryFilter?: string) => {
        const label = categoryFilter ? `"${categoryFilter}"` : 'cardápio completo';
        setGeneratingLabel(label);
        setIsGenerating(true);
        setDropdownOpen(false);
        try {
            await buildMenuPDF(visibleProducts, groupedByCategory, brand, categoryFilter);
        } catch (e) {
            console.error(e);
            alert('Erro ao gerar PDF. Verifique o console.');
        } finally {
            setIsGenerating(false);
            setGeneratingLabel('');
        }
    };

    const totalVisible = visibleProducts.length;
    const totalCats = Object.keys(groupedByCategory).length;

    return (
        <div className="space-y-6 bg-transparent pb-6">
            {/* ── Header Banner (KFC-style dark hero) ── */}
            <div
                className="relative overflow-hidden rounded-3xl"
                style={{ background: 'linear-gradient(135deg, #2c211d 0%, #3b2f2f 60%, #4a3830 100%)' }}
            >
                {/* Gold top band */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#d9a65a]" />

                <div className="px-8 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        {/* Logo circle */}
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d9a65a] bg-amber-50 flex-shrink-0 shadow-lg">
                            <img src="/logo_white.png" alt="Pão Caseiro" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <BookOpen size={14} className="text-[#d9a65a]" />
                                <span className="text-[#d9a65a] text-xs font-black uppercase tracking-widest">Gestão do Menu</span>
                            </div>
                            <h2 className="text-2xl font-black text-white leading-tight">{brand.name}</h2>
                            <p className="text-amber-300/80 text-xs italic mt-0.5">"{brand.slogan}"</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="bg-[#d9a65a]/20 text-[#d9a65a] text-xs font-bold px-3 py-1 rounded-full border border-[#d9a65a]/30">
                                    {totalVisible} produtos
                                </span>
                                <span className="bg-white/10 text-white/60 text-xs font-bold px-3 py-1 rounded-full">
                                    {totalCats} categorias
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Download buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Category dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(v => !v)}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-5 py-3 bg-white/10 border border-[#d9a65a]/40 text-white font-bold rounded-2xl hover:bg-white/20 transition-all text-sm disabled:opacity-50"
                            >
                                <Filter size={14} className="text-[#d9a65a]" />
                                Por Categoria
                                <ChevronDown size={13} className={`text-[#d9a65a] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                    <div className="p-2 max-h-64 overflow-y-auto">
                                        {Object.entries(groupedByCategory).map(([cat, prods]) => (
                                            <button
                                                key={cat}
                                                onClick={() => handleGeneratePDF(cat)}
                                                disabled={isGenerating}
                                                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#3b2f2f] hover:bg-amber-50 rounded-xl flex items-center justify-between gap-2 disabled:opacity-50"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getCatColor(cat) }} />
                                                    {cat}
                                                </span>
                                                <span className="text-xs text-gray-400">{prods.length} itens</span>
                                            </button>
                                        ))}
                                        {Object.keys(groupedByCategory).length === 0 && (
                                            <p className="text-xs text-gray-400 text-center py-4">Sem produtos visíveis</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Full menu download */}
                        <button
                            onClick={() => handleGeneratePDF()}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-6 py-3 bg-[#d9a65a] text-[#2c211d] font-black rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all text-sm disabled:opacity-60 whitespace-nowrap"
                        >
                            {isGenerating
                                ? <><Loader size={15} className="animate-spin" /> A gerar {generatingLabel}...</>
                                : <><Download size={15} /> Baixar Cardápio PDF</>
                            }
                        </button>
                    </div>
                </div>

                {/* Decorative dots pattern */}
                <div className="absolute bottom-4 right-8 opacity-10 text-4xl select-none pointer-events-none">
                    🍞 🥐 🥖
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d9a65a] via-transparent to-[#d9a65a] opacity-40" />
            </div>

            {/* ── Category Tabs ── */}
            <div className="flex gap-2 flex-wrap px-1">
                {uniqueCategories.map(cat => {
                    const count = cat === 'all'
                        ? visibleProducts.length
                        : visibleProducts.filter(p => (p.category || 'Outros') === cat).length;
                    const isActive = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border-2 ${
                                isActive
                                    ? 'bg-[#3b2f2f] text-[#d9a65a] border-[#3b2f2f] shadow-lg shadow-brown-900/20'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#d9a65a]/50 hover:text-[#3b2f2f]'
                            }`}
                            style={isActive ? {} : { borderColor: 'transparent' }}
                        >
                            {cat === 'all' ? 'Todos' : cat}
                            <span className={`ml-1.5 font-normal ${isActive ? 'text-[#d9a65a]/60' : 'text-gray-300'}`}>({count})</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Product Grid — KFC-style: dark header per section, grid of cards ── */}
            {totalVisible === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 py-24 text-center">
                    <Package size={52} className="mx-auto mb-4 text-gray-200" />
                    <p className="font-black text-gray-400 text-xl">Nenhum produto no menu</p>
                    <p className="text-sm text-gray-300 mt-2">
                        {products.length > 0
                            ? 'Use o ícone 👁 nos produtos para os adicionar ao cardápio.'
                            : 'Adicione produtos no catálogo primeiro.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(filteredGrouped).map(([cat, prods]) => prods.length === 0 ? null : (
                        <div key={cat} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                            {/* Category Header — dark brown, KFC-style */}
                            <div className="bg-[#3b2f2f] px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-8 rounded-full bg-[#d9a65a]" />
                                    <div>
                                        <h3 className="text-white font-black text-lg uppercase tracking-wide">{cat}</h3>
                                        <p className="text-[#d9a65a]/70 text-xs">{prods.length} {prods.length === 1 ? 'produto' : 'produtos'}</p>
                                    </div>
                                    <div
                                        className="ml-2 w-3 h-3 rounded-full"
                                        style={{ background: getCatColor(cat) }}
                                    />
                                </div>
                                <button
                                    onClick={() => handleGeneratePDF(cat)}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 text-xs font-bold text-[#3b2f2f] bg-[#d9a65a] px-3 py-2 rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    <Download size={11} /> PDF
                                </button>
                            </div>

                            {/* Products grid */}
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {/* Visible products */}
                                {prods.map(product => (
                                    <MenuCard
                                        key={product.id}
                                        product={product}
                                        visible={true}
                                        onToggle={() => toggleVisibility(product.id)}
                                        catColor={getCatColor(cat)}
                                    />
                                ))}
                                {/* Hidden products in this category (greyed out) */}
                                {(allGrouped[cat] || [])
                                    .filter(p => menuVisibility[p.id] === false)
                                    .map(product => (
                                        <MenuCard
                                            key={product.id}
                                            product={product}
                                            visible={false}
                                            onToggle={() => toggleVisibility(product.id)}
                                            catColor={getCatColor(cat)}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Click-away for dropdown */}
            {dropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />}
        </div>
    );
};

// ─── Product Card (KFC-style) ──────────────────────────────────
const MenuCard: React.FC<{
    product: Product;
    visible: boolean;
    onToggle: () => void;
    catColor: string;
}> = ({ product, visible, onToggle, catColor }) => (
    <div
        className={`bg-white rounded-2xl overflow-hidden border transition-all group cursor-default ${
            visible
                ? 'border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                : 'border-dashed border-gray-200 opacity-40 hover:opacity-70'
        }`}
    >
        {/* Image block */}
        <div className="relative overflow-hidden bg-amber-50" style={{ height: '100px' }}>
            {product.image_url ? (
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-amber-50 to-amber-100">
                    <span className="text-4xl opacity-30">🍞</span>
                </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Visibility toggle */}
            <button
                onClick={onToggle}
                title={visible ? 'Remover do cardápio' : 'Adicionar ao cardápio'}
                className={`absolute top-2 right-2 p-1.5 rounded-xl shadow-md transition-all ${
                    visible ? 'bg-white/90 text-emerald-600 hover:bg-white' : 'bg-gray-700/80 text-gray-300 hover:bg-gray-700'
                }`}
            >
                {visible ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>

            {/* Price badge anchored to bottom of image */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <div className="bg-[#3b2f2f] text-[#d9a65a] text-xs font-black px-3 py-1 rounded-lg shadow-lg">
                    {product.price.toFixed(2)} MT
                </div>
            </div>
        </div>

        {/* Info block */}
        <div className="p-3">
            <h4 className="font-bold text-[#3b2f2f] text-xs leading-snug line-clamp-2" style={{ minHeight: '28px' }}>
                {product.name}
            </h4>
            {product.description && (
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 leading-tight">{product.description}</p>
            )}
            <div className={`mt-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide ${visible ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${visible ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                {visible ? 'No cardápio' : 'Oculto'}
            </div>
        </div>
    </div>
);
