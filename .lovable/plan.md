
Objetivo: corrigir o erro de interpretação anterior e ajustar exatamente o que você pediu em `src/components/GanttChart.tsx`.

1. Restaurar a coluna de Duração
- Recolocar a coluna de duração na sidebar, entre `Fim` e `% Concl.`
- Não usar mais o sufixo `d`
- Mostrar apenas o número da duração, sem letra e sem afastamento artificial
- Reaproveitar a lógica já existente de duração manual/RUP, sem mudar cálculo interno

2. Reorganizar as larguras para caber tudo sem esconder informação
- Atualizar `sidebarCols` para voltar a ter 10 colunas
- Redistribuir espaço para:
  - `Início`
  - `Fim`
  - `Duração`
  - `% Concl.`
  - `Dep`
  - `Tipo`
  - `Equipe`
- Aplicar o mesmo grid no header e nas linhas das tarefas para manter alinhamento perfeito

3. Voltar a célula de duração nas linhas
- Recriar a célula visual da duração que foi removida
- Exibir valor limpo e centralizado
- Garantir que números como `1`, `12`, `120` apareçam completos

4. Corrigir a posição do percentual no Gantt
- Manter o cálculo dinâmico com base no último apontamento diário real
- Tirar o badge de cima da linha tracejada
- Posicionar o badge à direita do ponto do último apontamento, com folga horizontal
- Alinhar o badge na mesma altura da linha tracejada/barra, não acima dela
- Manter a regra de esconder quando não houver apontamento real

5. Ajuste fino visual
- Validar que o percentual não encoste na barra nem na data
- Garantir leitura limpa tanto em tarefas normais quanto atrasadas
- Preservar a semântica de cores atual

Resultado esperado
- A coluna de duração volta a aparecer
- O `d` some, ficando só o número
- Nenhum valor fica cortado
- O percentual no gráfico fica ao lado direito do último apontamento diário, e não acima

Arquivo afetado
- `src/components/GanttChart.tsx`
