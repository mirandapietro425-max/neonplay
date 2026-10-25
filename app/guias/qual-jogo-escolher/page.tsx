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

const questions: Array<{ key: 'time' | 'social' | 'style'; title: string; options: Array<{ label: string; value: Choice }> }> = [
  { key: 'time', title: 'Quanto tempo você tem agora?', options: [{ label: 'Só alguns minutos', value: 'curta' }, { label: 'Quero acompanhar uma progressão', value: 'progressiva' }] },
  { key: 'social', title: 'Você quer jogar...', options: [{ label: 'Sozinho', value: 'sozinho' }, { label: 'Com amigos ou outras pessoas', value: 'amigos' }] },
  { key: 'style', title: 'Qual proposta combina mais?', options: [{ label: 'Esporte', value: 'esporte' }, { label: 'Ação', value: 'acao' }, { label: 'Puzzle e lógica', value: 'puzzle' }, { label: 'Estratégia', value: 'estrategia' }] },
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

  return <main className="zg-shell"><div className="zg-wrap" style={{ maxWidth: 820, paddingBlock: '3rem' }}>
    <nav aria-label="Navegação estrutural"><Link href="/">Início</Link><span aria-hidden="true"> / </span><Link href="/guias">Guias</Link><span aria-hidden="true"> / </span><span>Qual jogo escolher?</span></nav>
    <article style={{ marginTop: '2rem', lineHeight: 1.75 }}>
      <p className="zg-kicker">QUIZ EDITORIAL ZAP GAME</p>
      <h1>Qual jogo de navegador combina com você?</h1>
      <p>Responda três perguntas e receba uma sugestão baseada em tempo, companhia e proposta. O resultado é uma recomendação editorial, não uma avaliação oficial do parceiro.</p>
      {result.length === 0 ? <section aria-live="polite" style={{ marginTop: '2rem' }}><p><strong>Pergunta {step + 1} de {questions.length}</strong></p><h2>{questions[step].title}</h2><div style={{ display: 'grid', gap: '0.8rem', maxWidth: 560 }}>{questions[step].options.map((option) => <button key={option.value} className="zg-secondary-btn" onClick={() => choose(option.value)}>{option.label}</button>)}</div></section> : <section aria-live="polite" style={{ marginTop: '2rem' }}><h2>Suas sugestões</h2><p>Comece pela primeira opção e explore as outras se quiser comparar estilos.</p><div className="zg-related-grid">{result.map((game, index) => <Link className="zg-related-card" key={game.href} href={game.href} onClick={() => trackGameEvent('quiz_recommendation_click', { quiz: 'qual_jogo_escolher', game_title: game.title, position: index + 1 })}><span>{game.title}</span><small>{game.reason}</small></Link>)}</div><button className="zg-reset" onClick={restart}>Refazer o quiz</button></section>}
      <p style={{ marginTop: '2rem' }}>Quer comparar os critérios? Veja o <Link href="/guias/comparativo-jogos-de-navegador">comparativo de jogos</Link> ou <Link href="/contato">envie uma sugestão</Link>.</p>
    </article>
  </div></main>
}
