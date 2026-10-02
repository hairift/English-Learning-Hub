# Homepage Just. Say It Design

## Goal

Redesign only the homepage left mission card and right growth card while keeping the current three-column homepage structure.

The selected direction is:

- Left card: a memorable, teacher-like opening prompt built around `Just. say it.`
- Primary CTA: `Say it`
- Right card: keep and strengthen gamified check-in motivation
- Middle coach card: remains in place and should continue to carry the virtual coach character

The intent is not to make the homepage more explanatory. The intent is to make it feel more human, more emotionally inviting, and more motivating for daily speaking practice.

## Current Problem

The current left card is functionally correct but emotionally flat.

Current issues:

- The large Chinese headline reads like an instruction panel rather than a teacher inviting the learner to speak.
- The copy explains the feature, but does not reduce the user's hesitation before speaking English.
- The primary action is clear, but the card does not create a strong memory point.
- The tone does not fully match the product's "AI speaking coach / companion teacher" positioning.

The current right card has useful data but needs stronger daily motivation.

Right-card direction:

- Keep gamified check-in.
- Keep streak, weekly progress, and next-practice motivation.
- Do not soften it into a pure teacher note. The user explicitly wants game-like check-in motivation.

## Selected Layout

Keep the existing homepage structure:

```text
Left: mission / start card
Middle: virtual coach card
Right: growth / streak card
```

Only the left and right cards are adjusted.

No mobile-first redesign is required in this iteration. Desktop is the main competition demo surface, but the cards should still collapse cleanly under the existing responsive rules.

## Left Mission Card

### Visual Role

The left card becomes the homepage's emotional entry point.

It should feel like a warm teacher is lowering the user's anxiety:

- You do not need to be perfect first.
- You only need to say it.
- The teacher will listen first, then help you improve.

### Main Text

Use the English phrase as the large visual headline:

```text
Just.
say it.
```

Use a green period for emphasis if it fits the final visual system:

```text
Just[green dot]
say it[green dot]
```

### Eyebrow

Use:

```text
YOUR TEACHER IS LISTENING
```

Reason:

- It makes the page feel more like a one-to-one speaking coach.
- It explains why the user can speak first without fear.
- It supports the virtual coach persona without adding long copy.

### Chinese Support Copy

Use:

```text
不用先想完美答案。你先开口，我先听完，再帮你改。
```

This is the core teacher tone. It should be visually prominent but below the English headline.

### Target Note

Use:

```text
今天的目标很小：把项目结果讲清楚，哪怕只讲一句也可以。
```

This should appear as a soft target panel, not as a loud warning or task badge.

### Primary CTA

Use:

```text
Say it
```

Reason:

- It connects directly to `Just. say it.`
- It is shorter and more memorable than `开始 5 分钟陪练`.
- The Chinese support copy already explains the action, so the button can be stronger and more branded.

### Secondary CTAs

Use Chinese labels for clarity:

```text
换个话题
看反馈
```

If there is no report available, hide or disable `看反馈` using the existing report availability logic.

### Low-Pressure Note

Use:

```text
不会实时打断。说完以后，再集中整理发音、语法和表达。
```

This line should be smaller and quieter. It reassures the user without competing with the main CTA.

## Right Growth Card

### Visual Role

The right card should motivate the user to continue daily practice.

It should feel game-like enough to encourage check-in, but not so game-like that it becomes a points shop or leaderboard.

Keep the MVP constraints:

- No coins
- No shop
- No leaderboard
- No punishment for missed days
- No complex level system

### Required Content

The card should show:

```text
打卡进度
连续练习 3 天
一 二 三 今 五 六 日
今天再来一次，本周进度就从 3/7 变成 4/7。
累计口语 28 分钟
最近得分 76
下一练：项目成果追问，专门补“结果量化表达”。
```

### Weekly Progress

Use seven day cells:

- Completed days are green and visually filled.
- Today is highlighted with yellow.
- Future days stay neutral.

This is more motivating than the current plain metric list because it gives the user a visible next tile to unlock.

### Reward Copy

Use:

```text
今天再来一次，本周进度就从 3/7 变成 4/7。
```

Reason:

- It is concrete.
- It makes the next action visually meaningful.
- It avoids negative pressure or punishment.

### Next Practice Copy

Use:

```text
下一练：项目成果追问，专门补“结果量化表达”。
```

This keeps the right card tied to the speaking improvement goal rather than becoming generic check-in decoration.

## Visual Style

Keep the current product style:

- Rounded cards
- Strong green primary action
- Light background
- Thick but soft borders
- Playful learning-app energy
- Existing virtual coach identity

Do not switch to a pure Fluent glass style for this card update. The current homepage already leans toward a bright learning-product style, and the new copy works best in that system.

Avoid:

- Emoji-heavy visual language
- Excessive challenge or punishment language
- Dark, dramatic, or overly adult coaching tone
- A marketing landing-page hero
- Turning the page into a feature explanation sheet

## Interaction Rules

Clicking `Say it` should keep the existing behavior of starting or entering the practice flow.

Clicking `换个话题` should keep the existing change-scene behavior.

Clicking `看反馈` should:

- Navigate to the latest report if a report exists.
- Be hidden or disabled if no report exists.

Right-card check-in visuals are display-only in this iteration. The actual check-in should still be completed after entering the report page, following the existing practice-completion logic.

## Implementation Scope

This design only changes:

- Homepage mission card text hierarchy
- Homepage mission card CTA labels
- Homepage growth card visual structure
- Homepage growth card copy
- Related CSS for these two cards

This design should not change:

- Practice flow
- API configuration
- Report page
- Scenario data model
- Check-in storage logic
- Virtual coach SVG/animation
- Backend behavior

## Acceptance Criteria

The implementation should be accepted when:

- The left card large headline reads `Just. say it.`
- The primary CTA reads `Say it`
- The Chinese support copy says the teacher will listen first and then help correct
- The right card shows a visible seven-day check-in row
- Today is visually highlighted as the next check-in tile
- The right card still shows streak, total speaking time, recent score, and next-practice recommendation
- The homepage remains a three-column layout on desktop
- The updated cards do not overlap or overflow in the desktop demo viewport
- Existing tests still pass
- The local browser screenshot matches the selected mockup direction
