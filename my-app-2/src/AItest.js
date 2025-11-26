import React, { useState, useEffect, useCallback } from 'react';

// ===============================================
// GitHub API 設定
// ===============================================
const GITHUB_BASE_URL = 'https://api.github.com/users/';
const DEFAULT_USERNAME = 'google'; 
const ITEM_PER_PAGE = 6; // *** 設定每頁顯示的專案數量為 6 ***

// -----------------------------------------------
// Sidebar: Open-Meteo & Dog API 整合元件
// -----------------------------------------------
function Sidebar({ latitude = 25.0330, longitude = 121.5654 }) {
  const [weather, setWeather] = useState(null);
  const [imgUrl, setImgUrl] = useState('');
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);


  const fallbackLocalImage = '/mnt/data/e9dc1788-c5d0-4d90-b2e8-55e81a62fe5e.png';

  // 取得天氣
  useEffect(() => {
    async function loadWeather() {
      setLoadingWeather(true);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('天氣資料取得失敗');
        const data = await res.json();
        setWeather(data.current_weather || null);
      } catch (e) {
        console.error(e);
        setWeather(null);
      } finally {
        setLoadingWeather(false);
      }
    }
    loadWeather();
  }, [latitude, longitude]);

  // dog API
  const refreshImage = useCallback(async () => {
    setLoadingImage(true);

    try {
      const res = await fetch('https://dog.ceo/api/breeds/image/random');
      if (!res.ok) throw new Error('狗狗圖片取得失敗');
      const data = await res.json();
      setImgUrl(data.message); // Dog API 回傳圖片網址在 message
    } catch (e) {
      console.error(e);
      setImgUrl(fallbackLocalImage);
    } finally {
      setTimeout(() => setLoadingImage(false), 400);
    }
  }, []);

  useEffect(() => {
    refreshImage();
  }, [refreshImage]);

  return (
    <aside style={sidebarStyles.wrap}>
      <div style={sidebarStyles.card}>
        <h3 style={sidebarStyles.title}>天氣 (台北)</h3>
        {loadingWeather ? (
          <p>載入中...</p>
        ) : weather ? (
          <div>
            <p style={{margin:4}}>溫度：<strong>{weather.temperature}°C</strong></p>
            <p style={{margin:4}}>風速：{weather.windspeed} km/h</p>
            <p style={{margin:4}}>風向：{weather.winddirection}°</p>
          </div>
        ) : (
          <p>無法取得天氣</p>
        )}
      </div>

      <div style={{height:16}} />

      <div style={sidebarStyles.card}>
        <h3 style={sidebarStyles.title}>可愛的狗照片</h3>
        <div style={{textAlign:'center'}}>
          <img
            src={imgUrl}
            alt="Dog"
            style={sidebarStyles.image}
            onError={(e) => { 
              e.target.onerror = null; 
              e.target.src = fallbackLocalImage; 
            }}
          />
          <div style={{display:'flex', gap:8, justifyContent:'center', marginTop:8}}>
            <button style={sidebarStyles.btn} onClick={refreshImage} disabled={loadingImage}>
              {loadingImage ? '載入中...' : '換一張'}
            </button>
            <a href={imgUrl || '#'} target="_blank" rel="noreferrer" style={sidebarStyles.link}>原圖</a>
          </div>
        </div>
      </div>

      <div style={{height:16}} />

      <div style={{...sidebarStyles.card, paddingBottom:18}}>
        <h4 style={{marginTop:0}}>新增的東西</h4>
        <p style={{margin:4}}>目前加入的 API：GitHub、天氣、Dog API 狗狗圖片</p>
      </div>
    </aside>
  );
}


// ===============================================
// 分頁控制元件
// ===============================================
const PaginationControls = ({ currentPage, totalPages, setCurrentPage }) => {
    if (totalPages <= 1) return null;

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    return (
        <div style={paginationStyles.controls}>
            <button 
                onClick={handlePrevious} 
                disabled={currentPage === 1}
                style={paginationStyles.button}
            >
                上一頁
            </button>
            <span style={paginationStyles.info}>
                第 {currentPage} 頁 / 共 {totalPages} 頁
            </span>
            <button 
                onClick={handleNext} 
                disabled={currentPage === totalPages}
                style={paginationStyles.button}
            >
                下一頁
            </button>
        </div>
    );
};


export default function GitHubRepos() {

  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [currentSearch, setCurrentSearch] = useState(DEFAULT_USERNAME); 
  const [repoList, setRepoList] = useState([]); 
  const [filteredList, setFilteredList] = useState([]); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState('');
  

  const [currentPage, setCurrentPage] = useState(1); 

  const totalPages = Math.ceil(filteredList.length / ITEM_PER_PAGE);

  // ===============================================
  // 核心邏輯：API 呼叫
  // ===============================================
  const fetchRepos = useCallback(async (user) => {
    if (!user) { setError('請輸入 GitHub 帳號'); return; }
    setLoading(true);
    setError('');
    setRepoList([]); 
    setFilteredList([]); 
    setCurrentPage(1);

    const url = `${GITHUB_BASE_URL}${user}/repos?sort=updated&per_page=100`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'react-personal-website-project' },
      });

      if (response.status === 404) {
        throw new Error(`找不到 GitHub 帳號: "${user}"`);
      }
      if (response.status === 403) {
         throw new Error(`API 請求超過限制 (Rate Limit Exceeded)。請稍後再試。`);
      }
      if (!response.ok) {
        throw new Error(`載入失敗: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const nonForkRepos = data.filter(repo => !repo.fork);
      
      setRepoList(nonForkRepos);
      setFilteredList(nonForkRepos);
      setCurrentSearch(user); 
      
      if (nonForkRepos.length === 0) {
          setError(`帳號 ${user} 沒有公開的原創儲存庫。`);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || '連線錯誤，無法獲取資料。');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchRepos(username);
  }, []);

  useEffect(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = repoList.filter(repo => 
        repo.name.toLowerCase().includes(lowerCaseSearch) ||
        (repo.description && repo.description.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredList(filtered);
    setCurrentPage(1); 
  }, [repoList, searchTerm]);


  const handleUserSearch = (e) => {
      e.preventDefault();
      fetchRepos(username.trim());
  };
  
  // ===============================================
  // *** 分頁計算邏輯 ***
  // 根據當前頁碼和每頁數量，取得該頁要顯示的項目
  const startIndex = (currentPage - 1) * ITEM_PER_PAGE;
  const endIndex = startIndex + ITEM_PER_PAGE;
  const currentItems = filteredList.slice(startIndex, endIndex);
  // ===============================================



  const RepoCard = ({ repo }) => {
    function getLanguageColor(lang) {
        const colors = {
            JavaScript: '#f1e05a', Python: '#3572A5', Java: '#b07219',
            HTML: '#e34c26', CSS: '#563d7c', TypeScript: '#2b7489',
            C: '#555555', 'C++': '#f34b7d', Ruby: '#701516',
        };
        return colors[lang] || '#cccccc';
    }
      
    return (
        <a 
            href={repo.html_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={styles.repoCard}
        >
            <h3>{repo.name}</h3>
            <p style={styles.description}>{repo.description || '無描述'}</p>
            <div style={styles.metadata}>
                {repo.language && (
                    <span style={styles.tag}>
                        <span style={{...styles.languageDot, backgroundColor: getLanguageColor(repo.language)}}></span>
                        {repo.language}
                    </span>
                )}
                <span style={styles.tag}>⭐ {repo.stargazers_count}</span>
                <span style={styles.tag}>Fork: {repo.forks_count}</span>
            </div>
            <div style={styles.updateTime}>
                更新於: {new Date(repo.updated_at).toLocaleDateString()}
            </div>
        </a>
    );
  };


  return (
    <div style={{display:'flex', gap:20, width:'100%', justifyContent:'center', padding:10}}>
      <div style={{width:'min(900px, 70%)'}}>
        <div style={styles.card}>
          <div style={styles.header}>
              GitHub 專案儀表板
          </div>

          {/* 1. 帳號輸入與主要搜尋 */}
          <form onSubmit={handleUserSearch} style={styles.searchForm}>
            <label style={styles.label}>
              <span>GitHub 帳號:</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="輸入 GitHub 使用者名稱"
                style={styles.input}
                disabled={loading}
              />
            </label>
            <button type="submit" style={styles.searchBtn} disabled={loading}>
              {loading && username === currentSearch ? '載入中...' : '顯示專案'}
            </button>

          </form>

          {/* 2. 專案篩選輸入 (互動功能) */}
          {repoList.length > 0 && (
              <div style={styles.filterSection}>
                  <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={`輸入你想要搜索的資料...`}
                      style={styles.filterInput}
                  />
              </div>
          )}

          {/* 3. 錯誤訊息 (Error 狀態) */}
          {error && <div style={styles.error}>⚠ {error}</div>}

          {/* 4. 專案列表 (資料顯示) */}
          <div style={styles.repoGrid}>
            {loading && username === currentSearch && repoList.length === 0 ? (
              <div style={styles.loadingState}>
                  <p>正在載入 {currentSearch} 的專案列表...</p>
              </div>
            ) : (
               currentItems.map(repo => (
                <RepoCard key={repo.id} repo={repo} />
              ))
            )}

            {!loading && repoList.length > 0 && filteredList.length === 0 && (
                <div style={styles.emptyState}>
                    找不到符合 "{searchTerm}" 關鍵字的專案。
                </div>
            )}
          </div>

          {/* 5. 分頁控制區 (下一頁/上一頁) */}
          {!loading && filteredList.length > 0 && (
              <PaginationControls 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  setCurrentPage={setCurrentPage}
              />
          )}
        </div>
      </div>

      {/* 側欄 */}
      <div style={{width:300}}>
        <Sidebar latitude={25.0330} longitude={121.5654} />
      </div>
    </div>
  );
}


// ===============================================
// 樣式
// ===============================================

// *** 新增分頁控制的樣式 ***
const paginationStyles = {
    controls: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        gap: 20,
        backgroundColor: '#f3f4f6',
    },
    button: {
        padding: '8px 16px',
        borderRadius: 8,
        border: '1px solid #866753ff',
        background: '#fff',
        color: '#866753ff',
        cursor: 'pointer',
        fontWeight: 600,
        transition: 'all 0.2s',
    },
    info: {
        fontSize: 14,
        color: '#9c8677ff',
        fontWeight: 500,
    }
}
// 側欄樣式
const sidebarStyles = {
  wrap: {
    position: 'sticky',
    top: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
  },
  title: { marginTop:0, marginBottom:8, color:'#333', fontSize:16 },
  image: { width: '100%', height: 'auto', borderRadius: 8, maxHeight: 220, objectFit: 'cover' },
  btn: { padding:'8px 10px', borderRadius:8, border:'none', background:'#866753ff', color:'#fff', cursor:'pointer' },
  link: { display:'inline-block', padding:'8px 10px', borderRadius:8, border:'1px solid #eee', textDecoration:'none', color:'#866753ff', fontWeight:600 }
}
// 原版樣式
const styles = {
    wrap: { 
        display: 'flex', 
        justifyContent: 'center',
        width: '100%', 
        padding: 5, 
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
    },
    card: {
        width: '100%', 
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(216, 173, 143, 0.1)',
        overflow: 'hidden',
        minHeight: 'calc(100vh - 32px)',
    },
    header: {
        padding: '12px 16px',
        fontWeight: 700,
        fontSize: 18,
        borderBottom: '1px solid #e5e7eb',
        background: '#866753ff', 
        color: '#fff',
    },
    searchForm: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        padding: 16,
        borderBottom: '1px solid #e5e7eb',
    },
    label: { 
        display: 'grid', 
        gap: 6, 
        fontSize: 13, 
        fontWeight: 600, 
        color: '#9c8677ff', 
        flexGrow: 1 
    },
    input: { 
        padding: '10px 12px', 
        borderRadius: 8, 
        border: '1px solid #d1d5db', 
        fontSize: 14, 
        width: '100%' 
    },
    searchBtn: {
        padding: '10px 20px',
        borderRadius: 8,
        border: 'none',
        background: '#ebb8b8ff', 
        color: '#fff',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    filterSection: {
        padding: '16px 16px 0 16px',
        borderBottom: '1px solid #e5e7eb',
    },
    filterInput: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #d1d5db',
        fontSize: 14,
        marginBottom: 16,
    },
    error: { 
        color: '#b91c1c', 
        padding: '12px 16px', 
        backgroundColor: '#fee2e2', 
        borderBottom: '1px solid #fca5a5' 
    },
    
    repoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: 20,
        padding: 20,
        flexGrow: 1,
        overflowY: 'auto', 
    },
    repoCard: {
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        backgroundColor: '#fff',
        transition: 'box-shadow 0.2s',
        textDecoration: 'none',
        color: 'inherit',
        height: '100%', 
    },
    description: {
        fontSize: 14,
        color: '#9c8677ff',
        marginBottom: 12,
        flexGrow: 1, 
    },
    metadata: {
        display: 'flex',
        gap: 15,
        alignItems: 'center',
        fontSize: 12,
        color: '#9c8677ff',
    },
    tag: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    languageDot: {
        width: 10,
        height: 10,
        borderRadius: '50%',
    },
    updateTime: {
        marginTop: 8,
        fontSize: 11,
        color: '#9c8677ff',
        textAlign: 'right',
    },
    loadingState: {
        gridColumn: '1 / -1', 
        textAlign: 'center',
        padding: '50px 0',
        fontSize: 18,
        color: '#9c8677ff',
    },
    emptyState: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '30px 0',
        fontSize: 16,
        color: '#9c8677ff',
    }
};
