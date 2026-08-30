(function () {
  'use strict';

  const START_LIVES = 6;

  const els = {
    setup: document.getElementById('setup'),
    game: document.getElementById('game'),
    summary: document.getElementById('summary'),
    startBtn: document.getElementById('startBtn'),
    slotToggle: document.getElementById('slotToggle'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    grid: document.getElementById('pickGrid'),
    teamForm: document.getElementById('teamForm'),
    teamInput: document.getElementById('teamInput'),
    teamList: document.getElementById('teamList'),
    playerForm: document.getElementById('playerForm'),
    playerInput: document.getElementById('playerInput'),
    feedback: document.getElementById('feedback'),
    teamBanner: document.getElementById('teamBanner'),
    teamBannerLogo: document.getElementById('teamBannerLogo'),
    teamBannerName: document.getElementById('teamBannerName'),
    livesPips: document.getElementById('livesPips'),
    summaryHeadline: document.getElementById('summaryHeadline'),
    summaryTeam: document.getElementById('summaryTeam'),
    summaryGrid: document.getElementById('summaryGrid'),
  };

  let DATA = null;
  let state = null;

  const NON_DECOMPOSING = { 'đ': 'dj', 'ð': 'd', 'ø': 'o', 'ł': 'l', 'æ': 'ae', 'œ': 'oe', 'ħ': 'h', 'ı': 'i' };
  const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/[đðøłæœħı]/g, (c) => NON_DECOMPOSING[c] || c)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function lastName(fullName) {
    const parts = normalize(fullName).split(' ').filter(Boolean);
    while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1])) parts.pop();
    return parts[parts.length - 1] || '';
  }

  function badgeColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    return `hsl(${hue}, 45%, 32%)`;
  }

  function badgeInitials(str) {
    const words = str.split(/\s+/).filter(w => w.length > 2 || /^[A-Z0-9]+$/.test(w));
    const letters = (words.length ? words : str.split(/\s+/)).slice(0, 3).map(w => w[0]);
    return letters.join('').toUpperCase().slice(0, 3);
  }

  function ordinal(n) {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  }

  async function loadData() {
    const res = await fetch('data/picks.json');
    DATA = await res.json();
    DATA.years = DATA.years.slice().sort((a, b) => b - a);
  }

  function pickRandomTeam() {
    const idx = Math.floor(Math.random() * DATA.teams.length);
    return DATA.teams[idx];
  }

  function buildCells(team) {
    return DATA.years.map((year) => {
      const pick = team.picks[String(year)] || null;
      return { year, pick, solved: false };
    });
  }

  function startGame() {
    const team = pickRandomTeam();
    const cells = buildCells(team);
    const activeCells = cells.filter(c => c.pick);

    state = {
      team,
      cells,
      activeCount: activeCells.length,
      solvedCount: 0,
      teamSolved: false,
      lives: START_LIVES,
      over: false,
      showSlot: els.slotToggle.checked,
    };

    els.setup.classList.add('hidden');
    els.summary.classList.add('hidden');
    els.game.classList.remove('hidden');

    els.teamBanner.classList.remove('solved');
    els.teamBannerLogo.classList.add('hidden');
    els.teamBannerLogo.style.backgroundImage = '';
    els.teamBannerName.textContent = '???';
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.teamInput.value = '';
    els.teamInput.disabled = false;
    els.playerInput.value = '';
    els.playerInput.disabled = false;
    els.playerForm.querySelector('button').disabled = false;
    els.teamForm.querySelector('button').disabled = false;

    renderTeamList();
    renderLives();
    renderGrid();
  }

  function renderTeamList() {
    els.teamList.innerHTML = '';
    DATA.teams.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.name;
      els.teamList.appendChild(opt);
    });
  }

  function renderLives() {
    els.livesPips.innerHTML = '';
    for (let i = 0; i < START_LIVES; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip' + (i < state.lives ? '' : ' spent');
      els.livesPips.appendChild(pip);
    }
  }

  function cellArt(pick) {
    if (pick.logo) {
      const img = document.createElement('div');
      img.className = 'cell-logo';
      img.style.backgroundImage = `url(${pick.logo})`;
      return img;
    }
    const badge = document.createElement('div');
    badge.className = 'cell-badge';
    badge.style.background = badgeColor(pick.school);
    badge.textContent = badgeInitials(pick.school);
    badge.title = pick.school;
    return badge;
  }

  function renderGrid() {
    els.grid.innerHTML = '';
    state.cells.forEach((cell) => {
      const div = document.createElement('div');
      div.className = 'cell' + (cell.pick ? '' : ' empty') + (cell.solved ? ' solved' : '');

      const yearTag = document.createElement('span');
      yearTag.className = 'year-tag';
      yearTag.textContent = cell.year;
      div.appendChild(yearTag);

      if (cell.pick) {
        if (state.showSlot) {
          const roundTag = document.createElement('span');
          roundTag.className = 'round-tag';
          roundTag.textContent = `R${cell.pick.round} · ${ordinal(cell.pick.pick)}`;
          div.appendChild(roundTag);
        } else if (cell.pick.round === 2) {
          const roundTag = document.createElement('span');
          roundTag.className = 'round-tag';
          roundTag.textContent = '2nd rd';
          div.appendChild(roundTag);
        }
        div.appendChild(cellArt(cell.pick));
        if (cell.solved) {
          const nameEl = document.createElement('div');
          nameEl.className = 'cell-player';
          nameEl.textContent = cell.pick.player;
          div.appendChild(nameEl);
        }
      }

      els.grid.appendChild(div);
    });
  }

  function setFeedback(msg, good) {
    els.feedback.textContent = msg;
    els.feedback.className = 'feedback ' + (good ? 'good' : 'bad');
  }

  function loseLife() {
    state.lives -= 1;
    renderLives();
    if (state.lives <= 0) {
      endGame(false);
    }
  }

  function checkWin() {
    if (state.solvedCount === state.activeCount && state.teamSolved) {
      endGame(true);
    }
  }

  function handlePlayerGuess(raw) {
    if (state.over || !raw.trim()) return;
    const guessNorm = normalize(raw);
    const guessLast = lastName(raw);

    let match = null;
    for (const cell of state.cells) {
      if (!cell.pick || cell.solved) continue;
      const full = normalize(cell.pick.player);
      const last = lastName(cell.pick.player);
      const aliasHit = (cell.pick.aliases || []).some((a) => normalize(a) === guessNorm);
      if (full === guessNorm || (last && last === guessLast) || aliasHit) {
        match = cell;
        break;
      }
    }

    if (match) {
      match.solved = true;
      state.solvedCount += 1;
      renderGrid();
      setFeedback(`Correct — ${match.pick.player} (${match.year})`, true);
      els.playerInput.value = '';
      checkWin();
    } else {
      setFeedback('Not a match on any open cell.', false);
      loseLife();
    }
  }

  function revealTeamBanner() {
    els.teamBanner.classList.add('solved');
    els.teamBannerLogo.classList.remove('hidden');
    els.teamBannerLogo.style.backgroundImage = `url(${state.team.logo})`;
    els.teamBannerName.textContent = state.team.name;
  }

  function handleTeamGuess(raw) {
    if (state.over || !raw.trim()) return;
    if (state.teamSolved) return;
    const guessNorm = normalize(raw);
    if (guessNorm === normalize(state.team.name)) {
      state.teamSolved = true;
      revealTeamBanner();
      setFeedback(`Correct — it's the ${state.team.name}!`, true);
      els.teamInput.value = '';
      checkWin();
    } else {
      setFeedback('Wrong team.', false);
      loseLife();
    }
  }

  function endGame(won) {
    state.over = true;
    els.playerInput.disabled = true;
    els.teamInput.disabled = true;
    els.playerForm.querySelector('button').disabled = true;
    els.teamForm.querySelector('button').disabled = true;

    // reveal everything
    state.cells.forEach((cell) => {
      if (cell.pick && !cell.solved) cell.solved = true;
    });
    renderGrid();
    if (!state.teamSolved) revealTeamBanner();

    setTimeout(() => showSummary(won), won ? 400 : 200);
  }

  function showSummary(won) {
    els.game.classList.add('hidden');
    els.summary.classList.remove('hidden');

    els.summaryHeadline.textContent = won
      ? 'You solved it!'
      : 'Out of lives';

    els.summaryTeam.innerHTML = '';
    const img = document.createElement('img');
    img.src = state.team.logo;
    img.alt = state.team.name;
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = state.team.name;
    els.summaryTeam.appendChild(img);
    els.summaryTeam.appendChild(name);

    els.summaryGrid.innerHTML = '';
    state.cells.forEach((cell) => {
      const row = document.createElement('div');
      if (!cell.pick) {
        row.className = 'summary-row none';
        row.innerHTML = `<span class="year">${cell.year}</span><span>No picks that year</span>`;
      } else {
        row.className = 'summary-row correct';
        const roundNote = cell.pick.round === 2 ? ' &middot; 2nd round' : '';
        row.innerHTML = `<span class="year">${cell.year}</span><span>${cell.pick.player} <span style="opacity:.6">(${cell.pick.school}${roundNote})</span></span>`;
      }
      els.summaryGrid.appendChild(row);
    });
  }

  els.startBtn.addEventListener('click', startGame);
  els.playAgainBtn.addEventListener('click', startGame);

  els.playerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePlayerGuess(els.playerInput.value);
  });

  els.teamForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleTeamGuess(els.teamInput.value);
  });

  loadData().catch((err) => {
    els.feedback.textContent = 'Failed to load draft data.';
    console.error(err);
  });
})();
