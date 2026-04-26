import { useEffect, useMemo, useState } from "react";

const apiBase = "/api/v1";

async function api(path, options = {}, token = null) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Erro na requisicao");
  return data;
}

function SectionTitle({ children }) {
  return <h2 className="section-title">{children}</h2>;
}

const emptyProfile = {
  fullName: "",
  nickname: "",
  category: "graduacao",
  program: "",
  bio: "",
};

function formatDateBR(value) {
  if (!value) return "-";
  const text = String(value);
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("pt-BR");
}

function formatCategoryBadge(category) {
  if (category === "graduacao") return "GRAD";
  if (category === "pos") return "PÓS";
  return "?";
}

function formatWinRate(value) {
  if (!value && value !== 0) return "-";
  const pct = Math.round(Number(value) * 100);
  return `${pct}%`;
}

function formatScheduledDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUserInScheduledMatch(match) {
  if (!me) return false;
  return (match.players || []).some((p) => p.userId === me.id);
}

const bannerIcons = [
  { src: "/ui/icon-wheat.svg", alt: "Trigo" },
  { src: "/ui/icon-sheep.svg", alt: "Ovelha" },
  { src: "/ui/icon-ore.svg", alt: "Minerio" },
  { src: "/ui/icon-brick.svg", alt: "Tijolo" },
  { src: "/ui/icon-gear.svg", alt: "Engrenagem" },
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [me, setMe] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [pending, setPending] = useState([]);
  const [matches, setMatches] = useState([]);
  const [avatarPresets, setAvatarPresets] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [notice, setNotice] = useState("");
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [filters, setFilters] = useState({
    category: "",
    query: "",
    period: "all",
    minMatches: "",
  });
  const [rankingSort, setRankingSort] = useState({ sort: "wins", order: "desc" });

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    identifier: "",
    email: "",
    password: "",
    fullName: "",
    nickname: "",
    category: "graduacao",
    program: "",
    bio: "",
    avatarKey: "wood",
  });

  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [matchForm, setMatchForm] = useState({
    matchDate: new Date().toISOString().slice(0, 10),
    notes: "",
    players: [
      { nickname: "", placement: 1, victoryPoints: 10 },
      { nickname: "", placement: 2, victoryPoints: 8 },
      { nickname: "", placement: 3, victoryPoints: 7 },
    ],
  });

  const [editMatchDrafts, setEditMatchDrafts] = useState({});
  const [adminSearch, setAdminSearch] = useState("");
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [newScheduledForm, setNewScheduledForm] = useState({
    title: "",
    scheduledDate: "",
    scheduledTime: "",
    minPlayers: 3,
    maxPlayers: 4,
  });

  const filteredQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.query) params.set("query", filters.query);
    if (filters.period) params.set("period", filters.period);
    params.set("sort", rankingSort.sort);
    params.set("order", rankingSort.order);
    if (filters.minMatches) params.set("minMatches", filters.minMatches);
    return `?${params.toString()}`;
  }, [filters, rankingSort]);

  useEffect(() => {
    loadLeaderboard();
  }, [filteredQuery]);

  useEffect(() => {
    loadMatches();
  }, [filters.period]);

  useEffect(() => {
    loadAvatarPresets();
  }, []);

  useEffect(() => {
    if (!token) {
      setMe(null);
      setPending([]);
      setAdminUsers([]);
      return;
    }
    loadMe();
  }, [token]);

  async function loadAvatarPresets() {
    try {
      const data = await api("/avatars/presets");
      setAvatarPresets(data.items || []);
      if (data.items?.[0]?.key) {
        setAuthForm((prev) => ({ ...prev, avatarKey: prev.avatarKey || data.items[0].key }));
      }
    } catch (error) {
      setNotice(`Erro ao carregar avatares: ${error.message}`);
    }
  }

  async function loadLeaderboard() {
    try {
      const data = await api(`/leaderboard${filteredQuery}`);
      setLeaderboard(data.items || []);
    } catch (error) {
      setNotice(`Erro ao carregar leaderboard: ${error.message}`);
    }
  }

  async function loadMatches() {
    setLoadingMatches(true);
    try {
      const params = new URLSearchParams({ status: "approved", period: filters.period || "all", limit: "50" });
      const data = await api(`/matches?${params.toString()}`);
      setMatches(data.items || []);
    } catch (error) {
      setNotice(`Erro ao carregar partidas: ${error.message}`);
    } finally {
      setLoadingMatches(false);
    }
  }

  async function loadMe() {
    try {
      const data = await api("/auth/me", {}, token);
      setMe(data);
      setProfileForm({
        fullName: data.full_name || "",
        nickname: data.nickname || "",
        category: data.category || "graduacao",
        program: data.program || "",
        bio: data.bio || "",
      });
      await Promise.all([loadMatches(), loadScheduledMatches()]);
      if (data.role === "admin") {
        await Promise.all([loadPending(), loadAdminUsers(adminSearch)]);
      }
    } catch (error) {
      setToken("");
      localStorage.removeItem("token");
      setNotice(`Sessao expirada: ${error.message}`);
    }
  }

  async function loadScheduledMatches() {
    setLoadingScheduled(true);
    try {
      const data = await api("/scheduled-matches?limit=20");
      setScheduledMatches(data.items || []);
    } catch (error) {
      console.error("Erro ao carregar partidas agendadas:", error);
    } finally {
      setLoadingScheduled(false);
    }
  }

  async function createScheduledMatch(event) {
    event.preventDefault();
    if (!token) {
      setNotice("Faça login para criar partidas.");
      return;
    }
    try {
      const dateTime = `${newScheduledForm.scheduledDate}T${newScheduledForm.scheduledTime || "00:00"}:00`;
      await api("/scheduled-matches", {
        method: "POST",
        body: JSON.stringify({
          title: newScheduledForm.title,
          scheduledDate: dateTime,
          minPlayers: newScheduledForm.minPlayers,
          maxPlayers: newScheduledForm.maxPlayers,
        }),
      }, token);
      setNotice("Partida agendada com sucesso!");
      setNewScheduledForm({ title: "", scheduledDate: "", scheduledTime: "", minPlayers: 3, maxPlayers: 4 });
      await loadScheduledMatches();
    } catch (error) {
      setNotice(`Erro ao criar partida: ${error.message}`);
    }
  }

  async function joinScheduledMatch(matchId) {
    try {
      await api(`/scheduled-matches/${matchId}/join`, { method: "POST" }, token);
      setNotice("Você entrou na partida!");
      await loadScheduledMatches();
    } catch (error) {
      setNotice(`Erro ao entrar na partida: ${error.message}`);
    }
  }

  async function leaveScheduledMatch(matchId) {
    try {
      await api(`/scheduled-matches/${matchId}/leave`, { method: "DELETE" }, token);
      setNotice("Você saiu da partida.");
      await loadScheduledMatches();
    } catch (error) {
      setNotice(`Erro ao sair da partida: ${error.message}`);
    }
  }

  async function cancelScheduledMatch(matchId) {
    try {
      await api(`/scheduled-matches/${matchId}`, { method: "DELETE" }, token);
      setNotice("Partida cancelada.");
      await loadScheduledMatches();
    } catch (error) {
      setNotice(`Erro ao cancelar partida: ${error.message}`);
    }
  }

  async function loadPending() {
    const subs = await api("/admin/submissions?status=pending", {}, token);
    setPending(subs.items || []);
  }

  async function loadAdminUsers(query = "") {
    if (!token) return;
    const params = new URLSearchParams({ includeInactive: "true" });
    if (query) params.set("query", query);
    const users = await api(`/admin/users?${params.toString()}`, {}, token);
    setAdminUsers(users.items || []);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload = authMode === "login"
        ? { identifier: authForm.identifier, password: authForm.password }
        : {
          email: authForm.email,
          password: authForm.password,
          fullName: authForm.fullName,
          nickname: authForm.nickname,
          category: authForm.category,
          program: authForm.program,
          bio: authForm.bio,
          avatarKey: authForm.avatarKey,
        };
      const data = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setToken(data.token);
      localStorage.setItem("token", data.token);
      setNotice("Autenticado com sucesso.");
    } catch (error) {
      setNotice(`Falha na autenticacao: ${error.message}`);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      await api("/me/profile", { method: "PUT", body: JSON.stringify(profileForm) }, token);
      setNotice("Perfil atualizado.");
      await loadMe();
      await loadLeaderboard();
    } catch (error) {
      setNotice(`Erro ao atualizar perfil: ${error.message}`);
    }
  }

  async function saveAvatarPreset(avatarKey) {
    try {
      await api("/me/avatar/preset", { method: "PUT", body: JSON.stringify({ avatarKey }) }, token);
      setNotice("Avatar atualizado.");
      await loadMe();
      await loadLeaderboard();
    } catch (error) {
      setNotice(`Erro ao atualizar avatar: ${error.message}`);
    }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await api("/me/avatar/upload", { method: "POST", body: formData }, token);
      setNotice("Avatar enviado com sucesso.");
      await loadMe();
      await loadLeaderboard();
    } catch (error) {
      setNotice(`Erro no upload: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function updateMatchPlayer(index, key, value) {
    setMatchForm((prev) => {
      const players = [...prev.players];
      players[index] = { ...players[index], [key]: key === "nickname" ? value : Number(value) };
      return { ...prev, players };
    });
  }

  function addMatchRow() {
    setMatchForm((prev) => {
      if (prev.players.length >= 6) return prev;
      return {
        ...prev,
        players: [...prev.players, { nickname: "", placement: prev.players.length + 1, victoryPoints: 5 }],
      };
    });
  }

  async function submitMatch(event) {
    event.preventDefault();
    try {
      await api("/submissions", { method: "POST", body: JSON.stringify(matchForm) }, token);
      setNotice("Partida enviada para moderacao.");
      setMatchForm({
        matchDate: new Date().toISOString().slice(0, 10),
        notes: "",
        players: [
          { nickname: "", placement: 1, victoryPoints: 10 },
          { nickname: "", placement: 2, victoryPoints: 8 },
          { nickname: "", placement: 3, victoryPoints: 7 },
        ],
      });
      if (me?.role === "admin") await loadPending();
    } catch (error) {
      setNotice(`Erro ao submeter partida: ${error.message}`);
    }
  }

  async function reviewSubmission(id, action) {
    try {
      const payload = action === "reject"
        ? { reason: window.prompt("Motivo da rejeicao:", "Dados inconsistentes") || "Dados inconsistentes" }
        : null;
      await api(
        action === "approve" ? `/admin/submissions/${id}/approve` : `/admin/submissions/${id}/reject`,
        { method: "POST", body: payload ? JSON.stringify(payload) : undefined },
        token
      );
      setNotice(action === "approve" ? "Submissao aprovada." : "Submissao rejeitada.");
      await Promise.all([loadPending(), loadLeaderboard(), loadMatches()]);
    } catch (error) {
      setNotice(`Erro na moderacao: ${error.message}`);
    }
  }

  function adminUserDefaultEdit(user) {
    return {
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      fullName: user.full_name,
      nickname: user.nickname,
      category: user.category,
      program: user.program || "",
      bio: user.bio || "",
    };
  }

  function updateAdminUserEdit(userId, patch) {
    setAdminUsers((prev) => prev.map((user) => {
      if (user.id !== userId) return user;
      const base = user._edit || adminUserDefaultEdit(user);
      return { ...user, _edit: { ...base, ...patch } };
    }));
  }

  function getMatchById(matchId) {
    return matches.find((item) => item.id === matchId);
  }

  function getMatchDraft(matchId) {
    if (editMatchDrafts[matchId]) return editMatchDrafts[matchId];
    const match = getMatchById(matchId);
    if (!match) return null;
    return {
      matchDate: match.match_date,
      notes: match.notes || "",
      players: (match.players || []).map((p) => ({
        nickname: p.nickname,
        placement: Number(p.placement),
        victoryPoints: Number(p.victoryPoints),
      })),
    };
  }

  useEffect(() => {
    if (me?.role !== "admin") return;
    setEditMatchDrafts((prev) => {
      const next = { ...prev };
      for (const match of matches) {
        if (!next[match.id]) {
          next[match.id] = {
            matchDate: match.match_date,
            notes: match.notes || "",
            players: (match.players || []).map((p) => ({
              nickname: p.nickname,
              placement: Number(p.placement),
              victoryPoints: Number(p.victoryPoints),
            })),
          };
        }
      }
      return next;
    });
  }, [matches, me?.role]);

  function setMatchDraft(matchId, draft) {
    setEditMatchDrafts((prev) => ({ ...prev, [matchId]: draft }));
  }

  function ensureMatchDraft(matchId) {
    const existing = editMatchDrafts[matchId];
    if (existing) return existing;
    const draft = getMatchDraft(matchId);
    if (!draft) return null;
    setMatchDraft(matchId, draft);
    return draft;
  }

  function updateDraftPlayer(matchId, index, key, value) {
    const base = ensureMatchDraft(matchId);
    if (!base) return;
    const players = [...base.players];
    players[index] = { ...players[index], [key]: key === "nickname" ? value : Number(value) };
    setMatchDraft(matchId, { ...base, players });
  }

  async function saveEditedMatch(match) {
    const draft = editMatchDrafts[match.id] || getMatchDraft(match.id);
    try {
      await api(`/admin/matches/${match.id}`, { method: "PUT", body: JSON.stringify(draft) }, token);
      setNotice("Partida atualizada.");
      await Promise.all([loadMatches(), loadLeaderboard()]);
    } catch (error) {
      setNotice(`Erro ao editar partida: ${error.message}`);
    }
  }

  async function deleteMatch(matchId) {
    const reason = window.prompt("Motivo da remocao logica da partida:", "Partida invalida") || "Partida invalida";
    try {
      await api(`/admin/matches/${matchId}`, { method: "DELETE", body: JSON.stringify({ reason }) }, token);
      setNotice("Partida removida logicamente.");
      await Promise.all([loadMatches(), loadLeaderboard()]);
    } catch (error) {
      setNotice(`Erro ao remover partida: ${error.message}`);
    }
  }

  async function saveAdminUser(user) {
    try {
      await api(`/admin/users/${user.id}`, { method: "PUT", body: JSON.stringify(user._edit) }, token);
      setNotice("Usuario atualizado.");
      await Promise.all([loadAdminUsers(adminSearch), loadLeaderboard()]);
    } catch (error) {
      setNotice(`Erro ao atualizar usuario: ${error.message}`);
    }
  }

  async function softDeleteUser(userId) {
    const reason = window.prompt("Motivo da remocao logica:", "Remocao administrativa") || "Remocao administrativa";
    try {
      await api(`/admin/users/${userId}`, { method: "DELETE", body: JSON.stringify({ reason }) }, token);
      setNotice("Usuario removido logicamente.");
      await Promise.all([loadAdminUsers(adminSearch), loadLeaderboard()]);
    } catch (error) {
      setNotice(`Erro ao remover usuario: ${error.message}`);
    }
  }

  function toggleRankingSort(sort) {
    setRankingSort((prev) => {
      if (prev.sort === sort) {
        return { sort, order: prev.order === "desc" ? "asc" : "desc" };
      }
      return { sort, order: "desc" };
    });
  }

  function sortArrow(sort) {
    if (rankingSort.sort !== sort) return "";
    return rankingSort.order === "desc" ? "▼" : "▲";
  }

  function isSortedColumn(sort) {
    return rankingSort.sort === sort;
  }

  function sortAriaLabel(sort, label) {
    const isCurrent = rankingSort.sort === sort;
    const nextOrder = isCurrent && rankingSort.order === "desc" ? "ascendente" : "descendente";
    return `Ordenar por ${label} (${nextOrder})`;
  }

  return (
    <div className="app-shell">
      <header className="hero hero-banner">
        <div className="hero-crest">
          <img src="/ui/lsc-shield.svg" alt="Escudo da Liga" />
        </div>
        <div className="hero-main">
          <h1>Liga Socialista do Catan</h1>
          <p>Leaderboard oficial do LSC - Laboratorio de Sistemas de Computacao (IC/UNICAMP)</p>
          <p className="muted">Swagger: <a href="/api/v1/docs" target="_blank" rel="noreferrer">/api/v1/docs</a></p>
        </div>
        <div className="hero-icons" aria-hidden="true">
          {bannerIcons.map((item) => (
            <span key={item.src} className="hero-icon-wrap" title={item.alt}>
              <img src={item.src} alt={item.alt} />
            </span>
          ))}
        </div>
        <div className="badge">LSC x CATAN</div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <section className="panel panel-leaderboard">
        <div className="tabs">
          <button type="button" className={activeTab === "leaderboard" ? "active" : ""} onClick={() => setActiveTab("leaderboard")}>Classificação</button>
          <button type="button" className={activeTab === "calendar" ? "active" : ""} onClick={() => { setActiveTab("calendar"); loadScheduledMatches(); }}>Calendário</button>
        </div>

        {activeTab === "leaderboard" && (
          <>
            <SectionTitle>Leaderboard</SectionTitle>
        <div className="filters filters-dark">
          <input placeholder="Buscar por nome ou nickname" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">Todos</option>
            <option value="graduacao">Graduação</option>
            <option value="pos">Pós-graduação</option>
          </select>
          <select value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })}>
            <option value="all">Geral</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="semester">Semestre</option>
          </select>
          <input type="number" min="0" placeholder="Min partidas" value={filters.minMatches} onChange={(e) => setFilters({ ...filters, minMatches: e.target.value })} />
        </div>
        <div className="muted sort-hint">Ordenacao: clique no cabecalho das colunas (Vitorias, Pontos, Partidas, Media).</div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Colono</th>
                <th className={isSortedColumn("wins") ? "sorted-col" : ""}>
                  <button type="button" className={`sort-header ${isSortedColumn("wins") ? "active" : ""}`} onClick={() => toggleRankingSort("wins")} aria-label={sortAriaLabel("wins", "vitorias")}>
                    <span className="sort-title">Vitórias {sortArrow("wins")}</span>
                    <small className="col-sub">(Trigo p/ povo)</small>
                  </button>
                </th>
                <th className={isSortedColumn("total") ? "sorted-col" : ""}>
                  <button type="button" className={`sort-header ${isSortedColumn("total") ? "active" : ""}`} onClick={() => toggleRankingSort("total")} aria-label={sortAriaLabel("total", "pontos")}>
                    <span className="sort-title">Pontos {sortArrow("total")}</span>
                    <small className="col-sub">(Recursos coletivos)</small>
                  </button>
                </th>
                <th className={isSortedColumn("matches") ? "sorted-col" : ""}>
                  <button type="button" className={`sort-header ${isSortedColumn("matches") ? "active" : ""}`} onClick={() => toggleRankingSort("matches")} aria-label={sortAriaLabel("matches", "partidas")}>
                    <span className="sort-title">Partidas {sortArrow("matches")}</span>
                    <small className="col-sub">(Esforço comum)</small>
                  </button>
                </th>
                <th className={isSortedColumn("average") ? "sorted-col" : ""}>
                  <button type="button" className={`sort-header ${isSortedColumn("average") ? "active" : ""}`} onClick={() => toggleRankingSort("average")} aria-label={sortAriaLabel("average", "media")}>
                    <span className="sort-title">Média {sortArrow("average")}</span>
                  </button>
                </th>
                <th className={isSortedColumn("winrate") ? "sorted-col" : ""}>
                  <button type="button" className={`sort-header ${isSortedColumn("winrate") ? "active" : ""}`} onClick={() => toggleRankingSort("winrate")} aria-label={sortAriaLabel("winrate", "taxa vitoria")}>
                    <span className="sort-title">Taxa Vitória {sortArrow("winrate")}</span>
                    <small className="col-sub">(Vitórias / Total)</small>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr key={row.id}>
                  <td className={`rank-cell ${idx === 0 ? "gold" : ""} ${idx === 1 ? "silver" : ""} ${idx === 2 ? "bronze" : ""}`}>
                    <span className="rank-chip">{idx + 1}</span>
                  </td>
                  <td>
                    <div className="player-cell">
                      <img className={`avatar ${idx < 3 ? "top-avatar" : ""}`} src={row.avatar_url} alt={`Avatar ${row.nickname}`} />
                      <div>
                        <div className="nickname-line">
                          <strong>{row.nickname}</strong>
                          <span className="category-badge">{formatCategoryBadge(row.category)}</span>
                        </div>
                        <div className="muted">{row.full_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className={isSortedColumn("wins") ? "sorted-col" : ""}>{row.wins}</td>
                  <td className={isSortedColumn("total") ? "sorted-col" : ""}>{row.total_points}</td>
                  <td className={isSortedColumn("matches") ? "sorted-col" : ""}>{row.matches_played}</td>
                  <td className={isSortedColumn("average") ? "sorted-col" : ""}>{row.avg_points}</td>
                  <td className={isSortedColumn("winrate") ? "sorted-col" : ""}>{formatWinRate(row.win_rate)}</td>
                </tr>
              ))}
</tbody>
            </table>
        </div>
          </>
        )}

        {activeTab === "calendar" && (
          <>
            <SectionTitle>Próximas Partidas</SectionTitle>
            {token && (
              <form onSubmit={createScheduledMatch} className="scheduled-match-form">
                <input placeholder="Título (opcional)" value={newScheduledForm.title} onChange={(e) => setNewScheduledForm({ ...newScheduledForm, title: e.target.value })} />
                <input type="date" value={newScheduledForm.scheduledDate} onChange={(e) => setNewScheduledForm({ ...newScheduledForm, scheduledDate: e.target.value })} required />
                <input type="time" value={newScheduledForm.scheduledTime} onChange={(e) => setNewScheduledForm({ ...newScheduledForm, scheduledTime: e.target.value })} required />
                <select value={newScheduledForm.minPlayers} onChange={(e) => setNewScheduledForm({ ...newScheduledForm, minPlayers: Number(e.target.value) })}>
                  <option value="2">Mín: 2</option>
                  <option value="3">Mín: 3</option>
                  <option value="4">Mín: 4</option>
                </select>
                <select value={newScheduledForm.maxPlayers} onChange={(e) => setNewScheduledForm({ ...newScheduledForm, maxPlayers: Number(e.target.value) })}>
                  <option value="3">Máx: 3</option>
                  <option value="4">Máx: 4</option>
                  <option value="5">Máx: 5</option>
                  <option value="6">Máx: 6</option>
                </select>
                <button type="submit" className="cta">Agendar Partida</button>
              </form>
            )}
            {!token && <p className="muted">Faça login para agendar novas partidas.</p>}

            {loadingScheduled && <p className="muted">Carregando partidas...</p>}
            {!loadingScheduled && scheduledMatches.length === 0 && <p className="muted">Nenhuma partida agendada.</p>}
            <div className="scheduled-matches-list">
              {scheduledMatches.map((match) => {
                const isFull = (match.player_count || 0) >= match.max_players;
                const userJoined = isUserInScheduledMatch(match);
                return (
                  <div key={match.id} className="scheduled-match-card">
                    <div className="scheduled-match-header">
                      <strong>{match.title || "Partida de Catan"}</strong>
                      <span className="scheduled-match-date">{formatScheduledDateTime(match.scheduled_date)}</span>
                    </div>
                    <div className="scheduled-match-info">
                      <span className="player-count">{match.player_count || 0}/{match.max_players} jogadores</span>
                      <span className="muted">Criador: {match.creator_nickname}</span>
                    </div>
                    <div className="scheduled-match-players">
                      {(match.players || []).map((p) => (
                        <span key={p.userId} className="scheduled-player" title={p.fullName || p.nickname}>
                          <img className="avatar-tiny" src={p.avatarUrl} alt={p.nickname} />
                        </span>
                      ))}
                    </div>
                    <div className="scheduled-match-actions">
                      {userJoined ? (
                        <button type="button" className="ghost" onClick={() => leaveScheduledMatch(match.id)}>Sair</button>
                      ) : (
                        <button type="button" className="cta" disabled={isFull} onClick={() => joinScheduledMatch(match.id)}>
                          {isFull ? "Lotado" : "Participar"}
                        </button>
                      )}
                      {me && me.id === match.creator_user_id && (
                        <button type="button" className="danger" onClick={() => cancelScheduledMatch(match.id)}>Cancelar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
      <div className="league-footer">LSC: Onde o trigo é de todos, mas as estradas são nossas!</div>

      <section className="split">
        <div className="panel">
          <SectionTitle>{token ? "Minha Conta" : "Entrar / Cadastrar"}</SectionTitle>
          {!token && (
            <form onSubmit={handleAuthSubmit} className="stack">
              <div className="auth-mode">
                <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button>
                <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Cadastro</button>
              </div>
              {authMode === "login" && (
                <>
                  <input required placeholder="Email ou nickname" value={authForm.identifier} onChange={(e) => setAuthForm({ ...authForm, identifier: e.target.value })} />
                  <input required placeholder="Senha" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
                </>
              )}
              {authMode === "register" && (
                <>
                  <input required placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
                  <input required placeholder="Senha" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
                  <input required placeholder="Nome completo" value={authForm.fullName} onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} />
                  <input required placeholder="Nickname" value={authForm.nickname} onChange={(e) => setAuthForm({ ...authForm, nickname: e.target.value })} />
                  <select value={authForm.category} onChange={(e) => setAuthForm({ ...authForm, category: e.target.value })}>
                    <option value="graduacao">Graduação</option>
                    <option value="pos">Pós-graduação</option>
                  </select>
                  <input placeholder="Curso/Programa" value={authForm.program} onChange={(e) => setAuthForm({ ...authForm, program: e.target.value })} />
                  <textarea placeholder="Bio" value={authForm.bio} onChange={(e) => setAuthForm({ ...authForm, bio: e.target.value })} />
                  <div>
                    <div className="muted">Avatar inicial</div>
                    <div className="avatar-grid">
                      {avatarPresets.map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          className={`avatar-btn ${authForm.avatarKey === preset.key ? "selected" : ""}`}
                          onClick={() => setAuthForm({ ...authForm, avatarKey: preset.key })}
                        >
                          <img src={preset.url} alt={preset.label} />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <button type="submit" className="cta">{authMode === "login" ? "Entrar" : "Criar conta"}</button>
            </form>
          )}

          {token && me && (
            <form onSubmit={saveProfile} className="stack">
              <div className="profile-head">
                <img className="avatar-large" src={me.avatar_url} alt="Avatar atual" />
                <div>
                  <div className="muted">Avatar atual</div>
                  <input type="file" accept="image/*" onChange={uploadAvatar} />
                </div>
              </div>
              <div className="avatar-grid">
                {avatarPresets.map((preset) => (
                  <button key={preset.key} type="button" className="avatar-btn" onClick={() => saveAvatarPreset(preset.key)}>
                    <img src={preset.url} alt={preset.label} />
                  </button>
                ))}
              </div>
              <input required value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} />
              <input required value={profileForm.nickname} onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })} />
              <select value={profileForm.category} onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}>
                <option value="graduacao">Graduação</option>
                <option value="pos">Pós-graduação</option>
              </select>
              <input value={profileForm.program} onChange={(e) => setProfileForm({ ...profileForm, program: e.target.value })} />
              <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
              <button className="cta" type="submit">Salvar perfil</button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setToken("");
                  localStorage.removeItem("token");
                  setMe(null);
                }}
              >
                Sair
              </button>
            </form>
          )}
        </div>

        <div className="panel">
          <SectionTitle>Enviar Resultado de Partida</SectionTitle>
          {!token && <p className="muted">Faca login para enviar partidas para moderacao.</p>}
          {token && (
            <form onSubmit={submitMatch} className="stack">
              <input type="date" value={matchForm.matchDate} onChange={(e) => setMatchForm({ ...matchForm, matchDate: e.target.value })} required />
              <textarea placeholder="Observacoes da partida" value={matchForm.notes} onChange={(e) => setMatchForm({ ...matchForm, notes: e.target.value })} />
              {matchForm.players.map((p, index) => (
                <div className="row" key={`player-${index}`}>
                  <input placeholder="Nickname" value={p.nickname} onChange={(e) => updateMatchPlayer(index, "nickname", e.target.value)} required />
                  <input type="number" min="1" max="6" value={p.placement} onChange={(e) => updateMatchPlayer(index, "placement", e.target.value)} required />
                  <input type="number" min="0" max="30" value={p.victoryPoints} onChange={(e) => updateMatchPlayer(index, "victoryPoints", e.target.value)} required />
                </div>
              ))}
              <button type="button" className="ghost" onClick={addMatchRow}>Adicionar jogador</button>
              <button className="cta" type="submit">Enviar para aprovacao</button>
            </form>
          )}
        </div>
      </section>

      <section className="panel">
        <SectionTitle>Partidas Anteriores (Aprovadas)</SectionTitle>
        {loadingMatches && <p className="muted">Carregando partidas...</p>}
        {!loadingMatches && matches.length === 0 && <p className="muted">Nenhuma partida aprovada no periodo.</p>}
        {matches.map((match) => {
          const draft = editMatchDrafts[match.id] || getMatchDraft(match.id);
          const matchDate = formatDateBR(match.match_date);
          const matchTitle = match.notes && match.notes.trim() ? match.notes.trim() : `Partida de ${matchDate}`;
          return (
            <div key={match.id} className="moderation-card">
              <div>
                <strong>{matchTitle}</strong>
                <div className="muted">Data: {matchDate}</div>
              </div>
              <ul className="match-list">
                {(match.players || []).map((p) => (
                  <li key={`${match.id}-${p.nickname}`}>
                    <img className="avatar-tiny" src={p.avatarUrl} alt={p.nickname} />
                    {p.placement}o - {p.nickname} ({p.victoryPoints} pts)
                  </li>
                ))}
              </ul>

              {me?.role === "admin" && (
                <div className="admin-edit-match">
                  <input type="date" value={draft.matchDate} onChange={(e) => setMatchDraft(match.id, { ...draft, matchDate: e.target.value })} />
                  <textarea value={draft.notes} onChange={(e) => setMatchDraft(match.id, { ...draft, notes: e.target.value })} />
                  {draft.players.map((player, index) => (
                    <div className="row" key={`${match.id}-edit-${index}`}>
                      <input value={player.nickname} onChange={(e) => updateDraftPlayer(match.id, index, "nickname", e.target.value)} />
                      <input type="number" min="1" max="6" value={player.placement} onChange={(e) => updateDraftPlayer(match.id, index, "placement", e.target.value)} />
                      <input type="number" min="0" max="30" value={player.victoryPoints} onChange={(e) => updateDraftPlayer(match.id, index, "victoryPoints", e.target.value)} />
                    </div>
                  ))}
                  <div className="actions">
                    <button type="button" className="cta" onClick={() => saveEditedMatch(match)}>Salvar edicao</button>
                    <button type="button" className="danger" onClick={() => deleteMatch(match.id)}>Excluir partida</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {me?.role === "admin" && (
        <>
          <section className="panel">
            <SectionTitle>Moderacao Admin</SectionTitle>
            {pending.length === 0 && <p className="muted">Nenhuma submissao pendente.</p>}
            {pending.map((item) => (
              <div key={item.id} className="moderation-card">
                <div>
                  <strong>{item.notes && item.notes.trim() ? item.notes.trim() : `Submissao de ${formatDateBR(item.match_date)}`}</strong>
                  <div className="muted">Data: {formatDateBR(item.match_date)} | Enviado por: {item.submitted_by_email || "bot"}</div>
                </div>
                <ul className="match-list">
                  {item.players.map((p) => (
                    <li key={`${item.id}-${p.nickname}`}>
                      <img className="avatar-tiny" src={p.avatarUrl} alt={p.nickname} />
                      {p.placement}o - {p.nickname} ({p.victoryPoints} pts)
                    </li>
                  ))}
                </ul>
                <div className="actions">
                  <button className="cta" onClick={() => reviewSubmission(item.id, "approve")}>Aprovar</button>
                  <button className="danger" onClick={() => reviewSubmission(item.id, "reject")}>Rejeitar</button>
                </div>
              </div>
            ))}
          </section>

          <section className="panel">
            <SectionTitle>Gestao de Usuarios (Admin)</SectionTitle>
            <div className="filters">
              <input
                placeholder="Buscar usuario por email/nickname"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
              <button type="button" className="ghost" onClick={() => loadAdminUsers(adminSearch)}>Buscar</button>
            </div>
            {adminUsers.map((user) => {
              const edit = user._edit || adminUserDefaultEdit(user);
              const userStatus = user.deleted_at ? "Inativo" : "Ativo";
              const removedAtText = user.deleted_at ? ` | Removido em ${formatDateBR(user.deleted_at)}` : "";
              return (
                <div key={user.id} className="moderation-card">
                  <div className="player-cell">
                    <img className="avatar" src={user.avatar_url} alt={user.nickname} />
                    <div>
                      <div className="nickname-line">
                        <strong>{user.nickname}</strong>
                        <span className="category-badge">{formatCategoryBadge(user.category)}</span>
                      </div>
                      <div className="muted">ID {user.id} | {userStatus}{removedAtText}</div>
                    </div>
                  </div>
                  <div className="stack">
                    <input value={edit.email} onChange={(e) => updateAdminUserEdit(user.id, { email: e.target.value })} />
                    <input value={edit.fullName} onChange={(e) => updateAdminUserEdit(user.id, { fullName: e.target.value })} />
                    <input value={edit.nickname} onChange={(e) => updateAdminUserEdit(user.id, { nickname: e.target.value })} />
                    <select value={edit.role} onChange={(e) => updateAdminUserEdit(user.id, { role: e.target.value })}>
                      <option value="player">Player</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select value={String(edit.isActive)} onChange={(e) => updateAdminUserEdit(user.id, { isActive: e.target.value === "true" })}>
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                  <div className="actions">
                    <button type="button" className="cta" onClick={() => saveAdminUser(user)}>Salvar</button>
                    <button type="button" className="danger" onClick={() => softDeleteUser(user.id)}>Remocao logica</button>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
