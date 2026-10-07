# Requirements

## 1. Training Journal

Athlore must allow me to record individual MMA training sessions.

Each session should support:

- Training date
- Category
- Training focus
- Duration
- Session type
- Techniques or skills learned
- Self-assessment
- Coach feedback
- Injury or discomfort notes
- Self-rating
- Mood
- What I'm proud of
- What I need to improve

A training day can contain multiple independent sessions.

The training date must be stored separately from when the entry was created or submitted.

### Session Details

A session may optionally contain exercise-level information, including:

- Exercise name
- Sets
- Repetitions
- Weight
- Weight unit
- Notes

Exercise tracking is optional and should not make basic session logging unnecessarily complicated.

### Session Type

A session can have multiple session types because a single training session may contain activities such as technique work and sparring.

### Categories

Category is required.

The system should allow me to select an existing category or add a custom one rather than forcing training into a fixed taxonomy.

---

## 2. Drafts and Data Safety

Training entries must not be easily lost.

Athlore should automatically save changes locally while a session is being entered.

Drafts should survive:

- App refreshes
- App restarts
- Temporary loss of connectivity
- Failed synchronization

Drafts should be recoverable from the app until they are successfully submitted.

A draft should only be considered submitted after the server confirms the submission.

The system should also avoid creating duplicate sessions when a submission is retried.

---

## 3. Training History

Athlore must provide access to previous training sessions.

I should be able to:

- Browse training history
- View individual sessions
- Search or filter sessions
- Review previous techniques and skills
- Review coach feedback
- Review reflections and self-assessments
- See training across different time periods

The original training date should be used when analyzing or displaying training history.

---

## 4. Progress Tracking

Athlore should help track progress toward training goals.

Goals should be able to have their own progression paths.

Progress may include:

- Training consistency
- Measurable performance metrics
- Skill development
- Completed milestones

### Milestones

Milestones can be either:

- **Measurable milestones**, which can be completed automatically when their criteria are met.
- **Skill milestones**, which I can mark as completed manually.

A milestone can optionally be associated with relevant training sessions.

---

## 5. Analytics

Athlore should provide basic analytics about my training.

Initial analytics should include:

- Number of sessions
- Number of training days
- Total training duration
- Training by category
- Training by session type
- Average self-rating
- Number of rated sessions
- Exercise history
- Sessions associated with milestones

Analytics should use the actual training date rather than the date an entry was created.

Where relevant, analytics should distinguish between **training sessions** and **training days**.

---

## 6. Training Intelligence

Athlore should use my training history to provide useful insights.

It should eventually allow me to:

- Ask questions about my training history
- Retrieve previously learned techniques and skills
- Find relevant coach feedback
- Identify recurring areas for improvement
- Discover patterns across training
- Summarize changes over time
- Generate weekly insights
- Request insights on demand

AI-generated information must be distinguishable from information directly recorded in my training history.

Athlore must not claim that I learned something, received specific coaching advice, or experienced something in training unless that information exists in my records.

AI features should remain separate from the core journal functionality so that the app remains useful even when AI is unavailable.

---

## 7. Training Planning

Athlore should eventually help me use my training history when thinking about future sessions.

It should be able to use relevant historical information to help identify:

- Areas that may need revisiting
- Skills I have not worked on recently
- Recurring areas for improvement
- Relevant previous coach feedback
- Progress toward a specific goal

Training planning should support my own decision-making rather than replace my coaches.

---

## 8. Existing Training Data

My existing training history should be migrated into Athlore during the initial setup.

The existing spreadsheet is a **one-time migration source**, not an ongoing input method.

There will not be a user-facing workbook import feature in the initial product.

Existing records should be preserved as accurately as possible during migration. Missing information should remain missing rather than being inferred.

Duplicate records should be detected during migration.

---

## 9. Logging Flexibility

The initial version should preserve the logging model I already use so that my existing history remains consistent with new entries.

In the future, Athlore may support configurable logging metrics so that athletes can choose what they want to track.

This is future scope and is not required for the MVP.

---

## 10. Mobile-first Experience

Athlore is initially designed for use on a phone.

The primary experience should make it easy to:

- Log a session quickly
- Review recent training
- Check progress
- View milestones
- Access training insights

Desktop support is not a priority for the initial version.

---

## 11. Authentication

The initial version should support Google sign-in.

Other authentication methods can be considered later.

---

## 12. MVP Scope

The MVP should focus on establishing the core training loop:

**Log → Review → Understand → Track progress**

The initial product should prioritize:

- Training journal
- Draft saving and data safety
- Training history
- Basic progress tracking
- Milestones
- Basic analytics
- Initial AI-powered training intelligence
- Migration of existing training history
- Google authentication
- Android-first mobile experience

More advanced AI capabilities, configurable logging, broader athlete support, and additional platform support can evolve after the core experience is working well.