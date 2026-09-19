import { createFileRoute } from "@tanstack/react-router";
import {
  Bell, BookOpen, Camera, ChevronRight, CircleUserRound, Clock3, Heart,
  Home, MapPin, MessageCircle, PackagePlus, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Star, Upload, WifiOff, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { citiesOf, provinceNames } from "@/lib/mozambique";
import tomatoes from "@/assets/tomatoes.jpg";
import spinach from "@/assets/spinach.jpg";
import sweetPotato from "@/assets/sweet-potato.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Machamba Digital — Mercado agrícola de Moçambique" },
      { name: "description", content: "Compra, vende e encontra produtos agrícolas perto de ti. Avalia também a tua cultura por fotografia." },
      { property: "og:title", content: "Machamba Digital — Mercado agrícola de Moçambique" },
      { property: "og:description", content: "Produtos da machamba, equipamentos e orientação para culturas num só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MachambaApp,
});

type Tab = "mercado" | "diagnostico" | "favoritos" | "mensagens" | "aprender" | "perfil";
type Product = { id: number; name: string; seller: string; province: string; location: string; distance: number; price: number; unit: string; category: string; image: string; rating: number; stock: string };

const products: Product[] = [
  { id: 1, name: "Tomate maduro", seller: "Rui M.", province: "Maputo Cidade", location: "KaMavota", distance: 2, price: 120, unit: "kg", category: "Hortaliças", image: tomatoes, rating: 4.9, stock: "Disponível hoje" },
  { id: 2, name: "Espinafre fresco", seller: "Ana S.", province: "Maputo Província", location: "Matola", distance: 4, price: 45, unit: "molho", category: "Hortaliças", image: spinach, rating: 4.8, stock: "12 molhos" },
  { id: 3, name: "Batata-doce", seller: "Júlio P.", province: "Maputo Província", location: "Boane", distance: 6, price: 60, unit: "kg", category: "Tubérculos", image: sweetPotato, rating: 4.7, stock: "35 kg" },
  { id: 4, name: "Milho branco", seller: "Carlos T.", province: "Manica", location: "Chimoio", distance: 12, price: 35, unit: "kg", category: "Sementes", image: sweetPotato, rating: 4.6, stock: "3 sacos" },
  { id: 5, name: "Castanha de caju", seller: "Fátima N.", province: "Nampula", location: "Monapo", distance: 18, price: 250, unit: "kg", category: "Frutas", image: tomatoes, rating: 4.9, stock: "50 kg" },
  { id: 6, name: "Couve manteiga", seller: "Elisa M.", province: "Sofala", location: "Beira", distance: 9, price: 40, unit: "molho", category: "Hortaliças", image: spinach, rating: 4.5, stock: "20 molhos" },
];


const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "mercado", label: "Mercado", icon: Home }, { id: "diagnostico", label: "Diagnóstico", icon: Camera },
  { id: "favoritos", label: "Favoritos", icon: Heart }, { id: "mensagens", label: "Mensagens", icon: MessageCircle },
  { id: "aprender", label: "Aprender", icon: BookOpen }, { id: "perfil", label: "Perfil", icon: CircleUserRound },
];

function AppButton({ children, onClick, variant = "primary", className = "", type = "button", ariaLabel }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "soft" | "plain" | "outline"; className?: string; type?: "button" | "submit"; ariaLabel?: string }) {
  const styles = { primary: "bg-primary text-primary-foreground hover:opacity-90", soft: "bg-secondary text-secondary-foreground hover:bg-muted", plain: "text-foreground hover:bg-muted", outline: "border border-border bg-card text-foreground hover:border-primary" };
  return <button type={type} onClick={onClick} aria-label={ariaLabel} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${styles[variant]} ${className}`}>{children}</button>;
}

function MachambaApp() {
  const [tab, setTab] = useState<Tab>("mercado");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [province, setProvince] = useState("Todas");
  const [city, setCity] = useState("Todas");

  const [favorites, setFavorites] = useState<number[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filtered = useMemo(() => products.filter((product) => {
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) || product.seller.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "Todos" || product.category === category;
    const matchesProvince = province === "Todas" || product.province === province;
    const matchesCity = city === "Todas" || product.location === city;
    return matchesQuery && matchesCategory && matchesProvince && matchesCity;
  }), [query, category, province, city]);


  const toggleFavorite = (id: number) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const showNotice = (message: string) => setNotice(message);

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-2.5 text-left" onClick={() => setTab("mercado")} aria-label="Ir ao mercado">
              <span className="grid size-10 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">M</span>
              <span><strong className="block font-display text-base leading-none">Machamba</strong><span className="text-xs text-muted-foreground">Digital</span></span>
            </button>
            <AppButton variant="soft" className="min-h-9 max-w-[55%] rounded-full px-3 text-xs" onClick={() => setFiltersOpen(true)}><MapPin className="size-3.5 shrink-0 text-accent" /> <span className="truncate">{city !== "Todas" ? city : province !== "Todas" ? province : "Todo o país"}</span></AppButton>
          </div>
          <div className="mt-3 flex gap-2 md:max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="O que procuras hoje?" className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </div>
            <AppButton variant="outline" className="size-11 px-0" ariaLabel="Abrir filtros" onClick={() => setFiltersOpen(true)}><SlidersHorizontal className="size-4" /></AppButton>
            <AppButton className="hidden md:inline-flex" onClick={() => setSellOpen(true)}><PackagePlus className="size-4" /> Vender</AppButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {tab === "mercado" && <MarketView products={filtered} category={category} setCategory={setCategory} favorites={favorites} toggleFavorite={toggleFavorite} setSelected={setSelected} setTab={setTab} setSellOpen={setSellOpen} />}
        {tab === "diagnostico" && <DiagnosisView showNotice={showNotice} />}
        {tab === "favoritos" && <FavoritesView products={products.filter((product) => favorites.includes(product.id))} toggleFavorite={toggleFavorite} setSelected={setSelected} setTab={setTab} />}
        {tab === "mensagens" && <MessagesView showNotice={showNotice} />}
        {tab === "aprender" && <LearnView />}
        {tab === "perfil" && <ProfileView showNotice={showNotice} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
        <div className="mx-auto grid max-w-xl grid-cols-6 px-1">
          {tabs.map((item) => { const Icon = item.icon; const active = tab === item.id; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[9px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}><Icon className={`size-5 ${active ? "fill-primary/10" : ""}`} /><span className="max-w-full truncate">{item.label}</span></button>; })}
        </div>
      </nav>

      {selected && <ProductModal product={selected} favorite={favorites.includes(selected.id)} onFavorite={() => toggleFavorite(selected.id)} onClose={() => setSelected(null)} showNotice={showNotice} />}
      {filtersOpen && <FilterModal category={category} province={province} city={city} onCategory={setCategory} onProvince={(value) => { setProvince(value); setCity("Todas"); }} onCity={setCity} onClose={() => setFiltersOpen(false)} />}
      {sellOpen && <SellModal onClose={() => setSellOpen(false)} onDone={() => { setSellOpen(false); showNotice("Anúncio guardado para revisão"); }} />}
      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg"><ShieldCheck className="size-4" />{notice}</div>}
    </div>
  );
}

function MarketView({ products: visible, category, setCategory, favorites, toggleFavorite, setSelected, setTab, setSellOpen }: { products: Product[]; category: string; setCategory: (value: string) => void; favorites: number[]; toggleFavorite: (id: number) => void; setSelected: (product: Product) => void; setTab: (tab: Tab) => void; setSellOpen: (open: boolean) => void }) {
  const categories = ["Todos", "Hortaliças", "Tubérculos", "Frutas", "Sementes", "Equipamentos"];
  return <div className="animate-enter">
    <section className="flex items-end justify-between"><div><p className="text-xs font-semibold text-primary">Sábado, 19 de Setembro</p><h1 className="mt-1 font-display text-3xl font-bold">Machamba de hoje</h1></div><span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><WifiOff className="size-3.5" /> Preparado para ligação fraca</span></section>
    <section className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
      <div className="relative overflow-hidden rounded-lg bg-primary p-5 text-primary-foreground sm:p-7">
        <span className="text-xs font-bold uppercase text-accent">Oferta do dia</span><h2 className="mt-1 font-display text-2xl font-bold">Tomate maduro</h2>
        <div className="mt-6 flex items-end justify-between"><div><strong className="font-display text-4xl">120</strong><span className="text-sm opacity-75"> MZN / kg</span></div><div className="text-right text-xs opacity-80"><strong className="block text-sm opacity-100">Rui M.</strong>Maputo · 2 km</div></div>
        <AppButton variant="soft" className="mt-5 w-full bg-background text-primary" onClick={() => { const featured = products[0]; if (featured) setSelected(featured); }}>Ver produto <ChevronRight className="size-4" /></AppButton>
      </div>
      <button onClick={() => setTab("diagnostico")} className="flex min-h-36 items-center gap-4 rounded-lg border border-accent/40 bg-accent/10 p-5 text-left transition-colors hover:bg-accent/15">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Sparkles className="size-6" /></span><span><strong className="font-display text-lg">Avaliar a minha cultura</strong><small className="mt-1 block text-muted-foreground">Tira uma fotografia e recebe orientação.</small></span><ChevronRight className="ml-auto size-5" />
      </button>
    </section>
    <section className="mt-7"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Produtos perto de ti</h2><button onClick={() => setCategory("Todos")} className="text-xs font-semibold text-primary">Ver tudo</button></div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold ${category === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{item}</button>)}</div>
      {visible.length ? <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => toggleFavorite(product.id)} onOpen={() => setSelected(product)} />)}</div> : <div className="mt-4 border-y border-border py-12 text-center"><Search className="mx-auto size-7 text-muted-foreground" /><h3 className="mt-3 font-display font-semibold">Nenhum produto encontrado</h3><p className="mt-1 text-sm text-muted-foreground">Experimenta outra pesquisa ou categoria.</p></div>}
    </section>
    <section className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-accent/35 bg-accent/10 p-4"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-accent" /><h2 className="font-display font-semibold">Compra com confiança</h2></div><p className="mt-1 text-sm text-muted-foreground">Confirma o produto antes de pagar e encontra-te num local seguro.</p></div><AppButton className="min-h-24 justify-between text-left" onClick={() => setSellOpen(true)}><span><span className="block font-display text-lg">Vender na minha banca</span><span className="block text-xs font-normal opacity-75">Publica produtos e equipamentos</span></span><PackagePlus className="size-6" /></AppButton></section>
  </div>;
}

function ProductCard({ product, favorite, onFavorite, onOpen }: { product: Product; favorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  return <article className="group flex overflow-hidden rounded-lg border border-border bg-card shadow-sm"><button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"><img src={product.image} alt={product.name} loading="lazy" width={816} height={816} className="size-20 shrink-0 rounded-md object-cover" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{product.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{product.seller} · {product.distance} km · {product.location}</span><span className="mt-2 flex items-center gap-2"><strong className="font-display text-base">{product.price} <small className="font-sans text-[10px] text-muted-foreground">MZN/{product.unit}</small></strong><span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Star className="size-3 fill-accent text-accent" />{product.rating}</span></span></span></button><button onClick={onFavorite} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} className="self-start p-3 text-muted-foreground hover:text-primary"><Heart className={`size-5 ${favorite ? "fill-primary text-primary" : ""}`} /></button></article>;
}

function DiagnosisView({ showNotice }: { showNotice: (message: string) => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const readFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showNotice("Fotografia demasiado grande (máx. 8 MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); showNotice("Fotografia carregada"); };
    reader.onerror = () => showNotice("Não foi possível ler a fotografia");
    reader.readAsDataURL(file);
  };

  const stopLive = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setLive(false); };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setLive(true);
      window.setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); } }, 0);
    } catch {
      if (cameraRef.current) cameraRef.current.click();
      else showNotice("Câmara indisponível. Escolhe uma fotografia guardada.");
    }
  };

  const shoot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", 0.85));
    stopLive();
    showNotice("Fotografia capturada");
  };

  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  return <section className="mx-auto max-w-2xl animate-enter"><p className="text-xs font-semibold text-primary">SAÚDE DA CULTURA</p><h1 className="mt-1 font-display text-3xl font-bold">Avaliar por fotografia</h1><p className="mt-2 text-sm text-muted-foreground">Fotografa uma folha afetada, com boa luz e sem filtros.</p>
    <div className="mt-6 rounded-lg border border-border bg-card p-4 sm:p-6"><label className="text-sm font-semibold" htmlFor="crop">Qual é a cultura?</label><select id="crop" className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option>Milho</option><option>Tomate</option><option>Mandioca</option><option>Feijão</option><option>Outra</option></select>
      <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={readFile} />
      <input ref={galleryRef} className="sr-only" type="file" accept="image/*" onChange={readFile} />
      <button onClick={() => galleryRef.current?.click()} className="mt-4 grid min-h-52 w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-primary/35 bg-secondary/50 text-center">{image ? <img src={image} alt="Fotografia da cultura" className="h-64 w-full object-cover" /> : <span><span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Camera className="size-6" /></span><strong className="mt-3 block">Escolher fotografia do telemóvel</strong><small className="mt-1 block text-muted-foreground">JPG ou PNG · máximo 8 MB</small></span>}</button>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AppButton variant="outline" onClick={() => { void openCamera(); }}><Camera className="size-4" /> Tirar fotografia</AppButton>
        <AppButton variant="outline" onClick={() => galleryRef.current?.click()}><Upload className="size-4" /> Carregar fotografia</AppButton>
      </div>
      {image && <div className="mt-3 grid gap-3 sm:grid-cols-2"><AppButton className="w-full" onClick={() => showNotice("Fotografia pronta para análise")}><Sparkles className="size-4" /> Analisar fotografia</AppButton><AppButton variant="plain" onClick={() => { setImage(null); showNotice("Fotografia removida"); }}><X className="size-4" /> Remover fotografia</AppButton></div>}
    </div><div className="mt-4 flex gap-3 rounded-lg border border-accent/35 bg-accent/10 p-4"><Sparkles className="size-5 shrink-0 text-accent" /><p className="text-xs leading-relaxed text-muted-foreground"><strong className="text-foreground">Avaliação orientativa.</strong> O resultado não substitui um agrónomo. Casos graves ou de baixa confiança devem ser revistos por um técnico.</p></div>
    {live && <div className="fixed inset-0 z-50 flex flex-col bg-foreground/95 p-4"><video ref={videoRef} playsInline muted className="min-h-0 flex-1 rounded-lg object-cover" /><div className="mt-4 grid grid-cols-2 gap-3"><AppButton variant="outline" onClick={stopLive}>Cancelar</AppButton><AppButton onClick={shoot}><Camera className="size-4" /> Capturar</AppButton></div></div>}
  </section>;
}


function FavoritesView({ products, toggleFavorite, setSelected, setTab }: { products: Product[]; toggleFavorite: (id: number) => void; setSelected: (product: Product) => void; setTab: (tab: Tab) => void }) { return <section className="animate-enter"><h1 className="font-display text-3xl font-bold">Favoritos</h1><p className="mt-1 text-sm text-muted-foreground">Produtos que guardaste para ver depois.</p>{products.length ? <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} favorite onFavorite={() => toggleFavorite(product.id)} onOpen={() => setSelected(product)} />)}</div> : <Empty icon={<Heart className="size-7" />} title="Ainda não guardaste produtos" text="Toca no coração de um anúncio para encontrá-lo aqui." action="Explorar mercado" onAction={() => setTab("mercado")} />}</section>; }

function MessagesView({ showNotice }: { showNotice: (message: string) => void }) { return <section className="mx-auto max-w-2xl animate-enter"><h1 className="font-display text-3xl font-bold">Mensagens</h1><p className="mt-1 text-sm text-muted-foreground">Conversa diretamente com compradores e vendedores.</p><div className="mt-6 space-y-2">{[{n:"Rui M.",m:"Sim, ainda tenho 20 kg disponíveis.",t:"10:42"},{n:"Ana S.",m:"Posso entregar amanhã na Matola.",t:"Ontem"}].map((chat) => <button key={chat.n} onClick={() => showNotice(`Conversa com ${chat.n} aberta`)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-display font-bold text-primary">{chat.n[0]}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{chat.n}</strong><span className="block truncate text-xs text-muted-foreground">{chat.m}</span></span><small className="text-muted-foreground">{chat.t}</small></button>)}</div></section>; }

function LearnView() { return <section className="animate-enter"><h1 className="font-display text-3xl font-bold">Aprender</h1><p className="mt-1 text-sm text-muted-foreground">Conselhos práticos para a tua produção.</p><div className="mt-6 grid gap-3 md:grid-cols-3">{[{t:"Como reconhecer a lagarta do funil",tag:"Milho",time:"4 min"},{t:"Guardar sementes durante a época húmida",tag:"Sementes",time:"6 min"},{t:"Preparar a horta para dias mais quentes",tag:"Hortaliças",time:"5 min"}].map((article) => <article key={article.t} className="rounded-lg border border-border bg-card p-5"><span className="text-xs font-bold text-primary">{article.tag}</span><h2 className="mt-2 font-display text-lg font-semibold leading-tight">{article.t}</h2><p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3.5" /> {article.time} de leitura</p></article>)}</div></section>; }

function ProfileView({ showNotice }: { showNotice: (message: string) => void }) { return <section className="mx-auto max-w-2xl animate-enter"><h1 className="font-display text-3xl font-bold">O meu perfil</h1><div className="mt-6 flex items-center gap-4 border-y border-border py-5"><span className="grid size-16 place-items-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">AM</span><div><h2 className="font-display text-lg font-semibold">Agricultor de Maputo</h2><p className="text-sm text-muted-foreground">Conta de demonstração · comprador e vendedor</p><p className="mt-1 flex items-center gap-1 text-xs text-primary"><ShieldCheck className="size-3.5" /> Perfil verificado</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><AppButton variant="outline" onClick={() => showNotice("Perfil pronto para editar")}>Editar perfil</AppButton><AppButton variant="outline" onClick={() => showNotice("Sem novos alertas")}>Notificações <Bell className="size-4" /></AppButton></div></section>; }

function Empty({ icon, title, text, action, onAction }: { icon: ReactNode; title: string; text: string; action: string; onAction: () => void }) { return <div className="mt-10 border-y border-border py-12 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">{icon}</span><h2 className="mt-4 font-display font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p><AppButton className="mt-5" onClick={onAction}>{action}</AppButton></div>; }

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-40 flex items-end bg-foreground/55 sm:items-center sm:justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-background p-5 sm:max-w-lg sm:rounded-xl"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{title}</h2><button onClick={onClose} aria-label="Fechar" className="grid size-10 place-items-center rounded-lg hover:bg-muted"><X className="size-5" /></button></div>{children}</section></div>; }

function ProductModal({ product, favorite, onFavorite, onClose, showNotice }: { product: Product; favorite: boolean; onFavorite: () => void; onClose: () => void; showNotice: (message: string) => void }) { return <ModalShell title="Detalhes do produto" onClose={onClose}><img src={product.image} alt={product.name} width={816} height={816} className="mt-4 aspect-[16/10] w-full rounded-lg object-cover" /><div className="mt-4 flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-primary">{product.category}</p><h3 className="font-display text-2xl font-bold">{product.name}</h3><p className="text-sm text-muted-foreground">{product.stock}</p></div><strong className="font-display text-xl">{product.price} <small className="font-sans text-xs text-muted-foreground">MZN/{product.unit}</small></strong></div><div className="mt-4 flex items-center justify-between border-y border-border py-4"><div><strong className="text-sm">{product.seller}</strong><p className="text-xs text-muted-foreground"><MapPin className="mr-1 inline size-3" />{product.location} · {product.distance} km</p></div><span className="flex items-center gap-1 text-sm"><Star className="size-4 fill-accent text-accent" />{product.rating}</span></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><AppButton onClick={() => { showNotice("Mensagem enviada ao vendedor"); onClose(); }}><MessageCircle className="size-4" /> Contactar vendedor</AppButton><AppButton variant="outline" className="px-3" ariaLabel="Guardar favorito" onClick={onFavorite}><Heart className={`size-5 ${favorite ? "fill-primary text-primary" : ""}`} /></AppButton></div></ModalShell>; }

function FilterModal({ category, province, onCategory, onProvince, onClose }: { category: string; province: string; onCategory: (value: string) => void; onProvince: (value: string) => void; onClose: () => void }) { return <ModalShell title="Filtrar mercado" onClose={onClose}><div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Categoria<select value={category} onChange={(event) => onCategory(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"><option>Todos</option><option>Hortaliças</option><option>Tubérculos</option><option>Frutas</option><option>Sementes</option><option>Equipamentos</option></select></label><label className="block text-sm font-semibold">Localização<select value={province} onChange={(event) => onProvince(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"><option>Todas</option><option>Maputo</option><option>Matola</option><option>Boane</option></select></label><AppButton className="w-full" onClick={onClose}>Aplicar filtros</AppButton></div></ModalShell>; }

function SellModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) { return <ModalShell title="Publicar anúncio" onClose={onClose}><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); onDone(); }}><label className="block text-sm font-semibold">Nome do produto<input required placeholder="Ex.: Milho branco" className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Preço (MZN)<input required type="number" min="1" placeholder="0" className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal" /></label><label className="block text-sm font-semibold">Unidade<select className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"><option>kg</option><option>saco</option><option>unidade</option><option>molho</option></select></label></div><label className="block text-sm font-semibold">Localização<input required placeholder="Distrito ou província" className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal" /></label><p className="text-xs text-muted-foreground">O anúncio será revisto antes de aparecer no mercado.</p><AppButton type="submit" className="w-full"><PackagePlus className="size-4" /> Enviar para revisão</AppButton></form></ModalShell>; }
