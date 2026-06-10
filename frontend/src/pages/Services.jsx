import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../api/axios';
import ServiceCard from '../components/ServiceCard';
import { Search } from 'lucide-react';

const CATEGORIES = ['Cleaning','Plumbing','Electrical','Gardening','Painting','Moving','Tutoring','Photography','Other'];

const Services = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    category: searchParams.get('category') || '',
    location: '',
    min_price: '',
    max_price: '',
    min_rating: '',
  });

  const fetchServices = async (f = filters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
      const res = await API.get('/services', { params });
      setServices(res.data.services || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchServices(filters);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    setSearchParams(params);
  };

  const handleCategoryClick = (cat) => {
    const newFilters = { ...filters, category: filters.category === cat ? '' : cat };
    setFilters(newFilters);
    fetchServices(newFilters);
  };

  const handleClear = () => {
    const empty = { keyword: '', category: '', location: '', min_price: '', max_price: '', min_rating: '' };
    setFilters(empty);
    fetchServices(empty);
    setSearchParams({});
  };

  return (
    <div className="page-wrapper">
      <div className="services-hero">
        <div className="container">
          <h1 className="h2">Find Services</h1>
          <p className="text-muted mt-2">{total} services available</p>
          <form className="services-search-bar" onSubmit={handleSearch}>
            <input className="input" placeholder="Search by name or description..." value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
            <input className="input" placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" className="btn btn-ghost" onClick={handleClear}>Clear</button>
          </form>
        </div>
      </div>

      <div className="container services-layout">
        {/* Sidebar Filters */}
        <aside className="services-sidebar">
          <div className="filter-panel">
            <h3 className="filter-title">Filters</h3>
            <div className="filter-section">
              <p className="filter-label">Category</p>
              <div className="filter-categories">
                {CATEGORIES.map((cat) => (
                  <button key={cat} className={`filter-cat-btn ${filters.category === cat ? 'active' : ''}`} onClick={() => handleCategoryClick(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-section">
              <p className="filter-label">Price Range ($)</p>
              <div className="price-range">
                <input className="input" type="number" placeholder="Min" min="0" value={filters.min_price} onChange={(e) => setFilters({ ...filters, min_price: e.target.value })} />
                <span className="price-sep">–</span>
                <input className="input" type="number" placeholder="Max" min="0" value={filters.max_price} onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} />
              </div>
            </div>
            <div className="filter-section">
              <p className="filter-label">Min Rating</p>
              <select className="select" value={filters.min_rating} onChange={(e) => setFilters({ ...filters, min_rating: e.target.value })}>
                <option value="">Any</option>
                {[1,2,3,4].map(n => <option key={n} value={n}>{n}+ stars</option>)}
              </select>
            </div>
            <button className="btn btn-primary w-full" onClick={() => fetchServices()}>Apply Filters</button>
          </div>
        </aside>

        {/* Results */}
        <main className="services-main">
          {loading ? (
            <div className="spinner-container"><div className="spinner" /></div>
          ) : services.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{display:'flex',justifyContent:'center',opacity:0.4}}><Search size={40} strokeWidth={1.5}/></div>
              <h3>No services found</h3>
              <p>Try adjusting your search or filters</p>
              <button className="btn btn-primary mt-4" onClick={handleClear}>Clear Filters</button>
            </div>
          ) : (
            <div className="grid-services grid">
              {services.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
          )}
        </main>
      </div>

      <style>{`
        .services-hero { background:linear-gradient(135deg,var(--bg-surface) 0%,var(--bg-card) 100%); border-bottom:1px solid var(--border); padding:var(--space-8) 0; }
        .services-search-bar { display:flex; gap:var(--space-3); margin-top:var(--space-5); flex-wrap:wrap; }
        .services-search-bar .input { flex:1; min-width:160px; }
        .services-layout { display:grid; grid-template-columns:260px 1fr; gap:var(--space-8); padding-top:var(--space-8); padding-bottom:var(--space-16); align-items:start; }
        .services-sidebar { position:sticky; top:88px; }
        .filter-panel { background:var(--gradient-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--space-6); display:flex; flex-direction:column; gap:var(--space-5); }
        .filter-title { font-size:1.1rem; font-weight:700; }
        .filter-section { display:flex; flex-direction:column; gap:var(--space-2); }
        .filter-label { font-size:.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; }
        .filter-categories { display:flex; flex-wrap:wrap; gap:var(--space-2); }
        .filter-cat-btn { padding:5px 12px; border-radius:var(--radius-full); font-size:.78rem; font-weight:600; background:rgba(255,255,255,.05); border:1px solid var(--border); color:var(--text-secondary); cursor:pointer; transition:var(--transition); }
        .filter-cat-btn.active, .filter-cat-btn:hover { background:rgba(108,99,255,.2); border-color:var(--primary); color:var(--primary-light); }
        .price-range { display:flex; align-items:center; gap:var(--space-2); }
        .price-sep { color:var(--text-muted); font-weight:700; }
        @media(max-width:900px){ .services-layout{grid-template-columns:1fr;} .services-sidebar{position:static;} }
      `}</style>
    </div>
  );
};

export default Services;
