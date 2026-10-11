-- neovim-practice.lua
-- Loaded into every Neovim editor session Project Studio starts (runtimes/neovim.cjs), before the
-- learner's own configuration. It measures how a file was edited, for the Neovim series' drills:
-- each drill has a keystroke target ("par"), and a `keys` check (desktop/app/project-checks.cjs)
-- compares the learner's count with it.
--
-- What it records, per buffer, from when the file was opened or last reloaded:
--   keys    keys the learner typed (not what mappings expand to), Insert-mode typing included
--   arrows  arrow, Home/End and Page keys among them (a drill fails if any were used)
--   mouse   mouse clicks, drags and scrolls among them (likewise)
--   seq     the keys as Neovim writes them (`ciwthere<Esc>`), for feedback
-- Keys typed for a write command (:w, :wq, :x, :up, :wa…) aren't counted, so par measures the
-- edit, not the save. Each write appends one JSON line to .practice/keystrokes.jsonl in the
-- working directory (the project folder).
local state = {}

local function fresh()
  return { keys = 0, arrows = 0, mouse = 0, seq = {}, started = vim.uv.hrtime(), pending = nil }
end

local function get(buf)
  state[buf] = state[buf] or fresh()
  return state[buf]
end

local function is_arrow(t)
  return t:match('Up>$') or t:match('Down>$') or t:match('Left>$') or t:match('Right>$')
    or t:match('Home>$') or t:match('End>$')
end

local function is_mouse(t)
  return t:match('Mouse>$') or t:match('Drag>$') or t:match('Release>$') or t:match('ScrollWheel')
end

local function count(st, typed)
  local t = vim.fn.keytrans(typed)
  st.keys = st.keys + 1
  if is_mouse(t) then st.mouse = st.mouse + 1 elseif is_arrow(t) then st.arrows = st.arrows + 1 end
  if #st.seq < 500 then table.insert(st.seq, t) end
end

vim.on_key(function(_, typed)
  if typed == nil or typed == '' then return end
  local st = get(vim.api.nvim_get_current_buf())
  local mode = vim.api.nvim_get_mode().mode
  -- A ':' command is held back until it runs, so a write command can be left out of the count.
  if typed == ':' and mode:match('^[nvV\22]') then
    st.pending = { typed }
  elseif st.pending and mode:sub(1, 1) == 'c' then
    table.insert(st.pending, typed)
  else
    count(st, typed)
  end
end)

local WRITE = { w = true, write = true, wq = true, x = true, xit = true, up = true, update = true, wa = true, wall = true, wqa = true, xa = true }

local group = vim.api.nvim_create_augroup('UpSkillOSPractice', { clear = true })

-- A buffer's file relative to the project folder, with / even on Windows (where Neovim gives
-- practice\maze.txt), so the patterns below match on every platform.
local function rel(buf)
  return (vim.fn.fnamemodify(vim.api.nvim_buf_get_name(buf), ':.'):gsub('\\', '/'))
end

vim.api.nvim_create_autocmd('CmdlineLeave', {
  group = group,
  callback = function()
    local st = get(vim.api.nvim_get_current_buf())
    local pending = st.pending
    st.pending = nil
    if not pending then return end
    local cmd = vim.trim(vim.fn.getcmdline() or ''):gsub('!$', '')
    if not vim.v.event.abort and WRITE[cmd] then return end
    for _, typed in ipairs(pending) do count(st, typed) end
  end,
})

-- Opening or reloading a file (:e!, or the file replaced on disk) starts its count again. A
-- drill's par assumes the cursor starts on the first character of the file, so a practice file
-- (practice/…) also gets its cursor put there, wherever Neovim would otherwise restore it.
vim.api.nvim_create_autocmd({ 'BufReadPost', 'FileChangedShellPost' }, {
  group = group,
  callback = function(args)
    state[args.buf] = fresh()
    if rel(args.buf):match('^practice/') then
      vim.schedule(function()
        if vim.api.nvim_buf_is_valid(args.buf) and vim.api.nvim_get_current_buf() == args.buf then
          pcall(vim.api.nvim_win_set_cursor, 0, { 1, 0 })
        end
      end)
    end
  end,
})

vim.api.nvim_create_autocmd('BufWritePost', {
  group = group,
  callback = function(args)
    local file = rel(args.buf)
    if file == '' or file:match('^%.practice/') then return end
    local st = get(args.buf)
    local dir = vim.fn.getcwd() .. '/.practice'
    vim.fn.mkdir(dir, 'p')
    local out = io.open(dir .. '/keystrokes.jsonl', 'a')
    if not out then return end
    out:write(vim.json.encode({
      file = file,
      keys = st.keys,
      arrows = st.arrows,
      mouse = st.mouse,
      seconds = math.floor((vim.uv.hrtime() - st.started) / 1e8) / 10,
      seq = table.concat(st.seq, ''),
      at = os.time(),
    }) .. '\n')
    out:close()
  end,
})
