'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { trackGameEvent } from '@/components/analytics-events'

type Choice = 'curta' | 'progressiva' | 'sozinho' | 'amigos' | 'esporte' | 'acao' | 'puzzle' | 'estrategia'
type Recommendation = { title: string; href: string; reason: string; tags: Choice[] }

const recommendations: Recommendation[] = [
  { title: 'Basketball Stars', href: '/jogos/gamepix-basketball-stars-35lbe', reason: 'Uma opção esportiva para quem quer competição direta.', tags: ['curta', 'amigos', 'esporte'] },
  { title: 'Bomber Friends', href: '/jogos/gamepix-bomber-friends-40344', reason: 'Uma arena de decisões rápidas e disputa com amigos.', tags: ['curta', 'amigos', 'acao'] },
  { title: 'Among at Easter', href: '/jogos/gamepix-among-at-easter-ng7tt', reason: 'Uma proposta de tarefas e dedução social para grupos.', tags: ['progressiva', 'amigos', 'estrategia'] },
  { title: 'Babel Tower', href: '/jogos/gamepix-babel-tower-45tbr', reason: 'Construção e gerenciamento para acompanhar com mais calma.', tags: ['progressiva', 'sozinho', 'estrategia'] },
  { title: 'Amaze Escape', href: '/jogos/gamepix-amaze-escape-am511', reason: 'Um desafio de lógica para resolver no seu ritmo.', tags: ['curta', 'sozinho', 'puzzle'] },
  { title: 'Alpha Guns', href: '/jogos/gamepix-alpha-guns-40450', reason: 'Ação lateral com fases e ritmo arcade.', tags: ['progressiva', 'sozinho', 'acao'] },
]

const questions: Array<{ key: 'time' | 'social' | 'style'; title: string; hint: string; icon: string; options: Array<{ label: string; sublabel: string; value: Choice }> }> = [
  { key: 'time', title: 'Quanto tempo você tem agora?', hint: 'Escolha o ritmo da sua próxima partida.', icon: '/brand/quiz-icon-time.webp', options: [{ label: 'Só alguns minutos', sublabel: 'Quero jogar e voltar rápido', value: 'curta' }, { label: 'Quero acompanhar uma progressão', sublabel: 'Tenho tempo para entrar no clima', value: 'progressiva' }] },
  { key: 'social', title: 'Você quer jogar...', hint: 'A experiência fica melhor quando combina com o seu momento.', icon: '/brand/quiz-icon-social.webp', options: [{ label: 'Sozinho', sublabel: 'Meu ritmo, minhas decisões', value: 'sozinho' }, { label: 'Com amigos ou outras pessoas', sublabel: 'Competição ou diversão em grupo', value: 'amigos' }] },
  { key: 'style', title: 'Qual proposta combina mais?', hint: 'Última escolha. Depois vem a sua combinação.', icon: '/brand/quiz-icon-action.webp', options: [{ label: 'Esporte', sublabel: 'Disputa e placar', value: 'esporte' }, { label: 'Ação', sublabel: 'Ritmo e reflexo', value: 'acao' }, { label: 'Puzzle e lógica', sublabel: 'Resolver no seu ritmo', value: 'puzzle' }, { label: 'Estratégia', sublabel: 'Pensar antes de agir', value: 'estrategia' }] },
]

export default function QuizPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Choice[]>([])
  const [started, setStarted] = useState(false)
  const result = useMemo(() => {
    if (answers.length < questions.length) return []
    return [...recommendations].sort((a, b) => {
      const score = (game: Recommendation) => answers.reduce((total, answer) => total + (game.tags.includes(answer) ? 1 : 0), 0)
      return score(b) - score(a)
    }).slice(0, 3)
  }, [answers])

  const choose = (value: Choice) => {
    if (!started) { setStarted(true); trackGameEvent('quiz_start', { quiz: 'qual_jogo_escolher' }) }
    const nextAnswers = [...answers, value]
    setAnswers(nextAnswers)
    if (step < questions.length - 1) setStep(step + 1)
    else trackGameEvent('quiz_complete', { quiz: 'qual_jogo_escolher', answers: nextAnswers.join(',') })
  }

  const restart = () => { setStep(0); setAnswers([]); setStarted(false) }
  const current = questions[step]

  return <main className="zg-shell zg-quiz-page"><div className="zg-wrap" style={{ maxWidth: 1080, paddingBlock: '2rem 4rem' }}>
    <nav className="zg-breadcrumbs" aria-label="Navegação estrutural"><Link href="/">Início</Link><span aria-hidden="true">/</span><Link href="/guias">Guias</Link><span aria-hidden="true">/</span><span aria-current="page">Qual jogo escolher?</span></nav>
    <section className="zg-quiz-hero">
      <div className="zg-quiz-hero-copy"><p className="zg-eyebrow">QUIZ EDITORIAL ZAP GAME</p><h1>Qual jogo combina com <span>você?</span></h1><p>Três perguntas rápidas. Uma próxima partida com mais a sua cara.</p><div className="zg-quiz-stats"><span><b>03</b> perguntas</span><span><b>06</b> jogos na curadoria</span><span><b>01</b> combinação</span></div></div>
    </section>
    <section className="zg-quiz-panel" aria-label="Quiz de recomendação">
      {result.length === 0 ? <>
        <div className="zg-quiz-progress-head"><div><p className="zg-kicker">SUA JORNADA</p><h2>Pergunta {step + 1} <span>/ {questions.length}</span></h2></div><span className="zg-quiz-progress-label">{Math.round(((step + 1) / questions.length) * 100)}% completo</span></div>
        <div className="zg-quiz-progress"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
        <div className="zg-quiz-question"><div className="zg-quiz-question-art"><img src={current.icon} alt="" /></div><div className="zg-quiz-question-copy"><p className="zg-kicker">{current.key === 'time' ? 'RITMO' : current.key === 'social' ? 'COMPANHIA' : 'ESTILO'}</p><h2>{current.title}</h2><p>{current.hint}</p></div></div>
        <div className={`zg-quiz-options ${current.options.length === 4 ? 'zg-quiz-options-four' : ''}`}>{current.options.map((option, index) => <button className="zg-quiz-option" key={option.value} onClick={() => choose(option.value)}><span className="zg-quiz-option-number">0{index + 1}</span><span><strong>{option.label}</strong><small>{option.sublabel}</small></span><i aria-hidden="true">↗</i></button>)}</div>
      </> : <section className="zg-quiz-result" aria-live="polite"><div className="zg-quiz-result-top"><div><p className="zg-kicker">COMBINAÇÃO ENCONTRADA</p><h2>Seu próximo jogo está aqui.</h2><p>Comece pela primeira opção e explore as outras se quiser comparar estilos.</p></div><img src="/brand/quiz-icon-strategy.webp" alt="" /></div><div className="zg-quiz-result-grid">{result.map((game, index) => <Link className="zg-quiz-result-card" key={game.href} href={game.href} onClick={() => trackGameEvent('quiz_recommendation_click', { quiz: 'qual_jogo_escolher', game_title: game.title, position: index + 1 })}><span className="zg-quiz-rank">0{index + 1}</span><span className="zg-quiz-result-title">{game.title}</span><small>{game.reason}</small><b>Ver ficha <span>↗</span></b></Link>)}</div><button className="zg-reset" onClick={restart}>↺ Refazer o quiz</button></section>}
    </section>
    <section className="zg-quiz-footer-cta"><div><p className="zg-kicker">AINDA EXPLORANDO?</p><h2>Compare antes de jogar.</h2></div><Link className="zg-primary-btn" href="/guias/comparativo-jogos-de-navegador">Abrir comparativo <span>↗</span></Link></section>
  </div></main>
}
