# F2: Problem Framing — Sound It Out

**Team:** Rebecca Xiong, Victor, Sanskriti Singh, Bhadra Rupesh  
**Course:** MIT 6.1040 Software Design · Fall 2026  
**Project:** Sound It Out — defining and sharing a personal music vocabulary

> **Central problem.** A listener may know exactly what a desired sound feels like yet be unable to convey it with a word such as *dreamy* or *hype*. A friend can understand the word but imagine a different sound. Even after the listener supplies examples and corrections, that shared understanding is usually scattered across messages and must be reconstructed the next time they ask. Our focus is **communicating a personal interpretation of music**, with better recommendations as a possible result—not building a replacement for a streaming service's recommendation engine.

## 1. Domain: Communicating subjective music preferences

People often look for music to fit a particular moment: a commute, a study session, a gathering with friends, or a mood they want to sustain. They may already know songs that evoke the feeling they want, but want something new that sounds similar in the *right way*. They turn to friends, playlists, music-search tools, and recommendation systems because describing an arrangement of vocals, instruments, rhythm, production, and personal associations is harder than recognizing it when they hear it.

To make these requests manageable, people use short descriptions such as *dreamy*, *hype*, *nostalgic*, or *relaxing*. Those words are useful shortcuts, but they do not specify exactly which aspects of a song matter. One person's *dreamy* may be soft acoustic guitar; another's may be dense synthesizers, echoing voices, and an atmospheric mix. Neither interpretation is wrong. Moreover, two songs that sound different by conventional genre labels may create a similar feeling for one listener, while two songs with the same genre or mood label may not.

When asking a friend for a suggestion, listeners can go beyond words by sending an example song, describing what they like about it, or rejecting a proposed song. Friends usually want to help, but they have to infer which parts of an example matter: the melody, lyrics, vocal texture, energy, instrumentation, or a memory the song evokes. A link to an example can show *what* the listener likes without explaining *why*. The listener may only discover that they and their friend understood the request differently after hearing several unsuitable suggestions.

Existing music platforms provide strong tools for discovering and sharing songs. They can learn from listening history, accept natural-language requests, and let people build playlists together. This project addresses a narrower activity that happens before or during those actions: **establishing a shared, revisable understanding of what a subjective musical description means to one particular person**. Success is not necessarily finding the objectively best song. It is enabling someone else to suggest a song with enough context to understand and respond to the listener's taste.

Our intended starting audience is people who already exchange music recommendations with friends and occasionally struggle to explain the particular sound they want. We are not assuming that everyone wants to document their taste or that every recommendation requires a special tool.

## 2. Bad situations

The following are *illustrative scenarios* grounded in the project's pitch and peer feedback, not transcripts of observed user sessions. They describe failures we plan to test through user research.

### Bad situation A: The word is understood, but the sound is not

Maya has listened to the same commute playlist for weeks and wants new songs with the same feeling. She asks her friend Jordan for something *dreamy*. Maya has a particular sound in mind: spacious electronic production, layered synthesizers, and vocals that seem to echo at a distance. Jordan associates *dreamy* with quiet acoustic music and slow piano, so Jordan sends several songs that fit that interpretation.

Maya listens and explains that the suggestions are too gentle. Jordan responds with a different set of songs. Maya sends a favorite track as an example, but Jordan cannot tell whether its tempo, singer, production, or overall mood is the important part. Maya tries to explain again, this time saying that she wants the *echoing vocals* but not necessarily the *slow tempo*. Each correction helps a little, yet both people spend more effort clarifying the request than either expected.

Maya may stop asking or settle for a less suitable playlist. Jordan has invested time in a thoughtful recommendation that still misses the mark. The difficulty is not a lack of music, an uncaring friend, or even disagreement about whether a song is good. **The same ordinary word conceals two different interpretations, and neither person can inspect the other's meaning until a recommendation fails.** This can recur whenever they search for another subjective sound.

### Bad situation B: The explanation disappears after the conversation

Later, Maya wants similarly atmospheric music for an evening walk. During the earlier exchange, she and Jordan eventually identified two songs that fit, one that did not, and an important distinction: *echoing vocals* matter more to Maya's idea of *dreamy* than low volume or a slow beat. But that understanding is distributed across a long conversation containing links, reactions, and corrections. There is no concise, usable representation of what they learned.

Maya asks another friend, Avery, for recommendations. Avery sees the word *dreamy* but not the earlier examples and exclusions, so the same misunderstanding begins again. Maya could search her old chat, collect the relevant links, and write a fresh explanation, but doing so takes more effort than sending a quick message. She may instead give a broad description and accept another round of mismatches. If her taste changes over time, the old conversation is even less useful because it does not show which examples she still agrees with.

This is different from a bad recommendation in a single moment. **A listener's preferences become clearer through conversation, but the clarification is treated as disposable conversation history rather than something that can travel to the next request and be revised.** The repeated burden falls on the listener who has to explain their taste, and on friends who have to guess it again.

### The common failure

In the first situation, the requested *word* survives communication but its intended *meaning* does not. In the second, the meaning briefly becomes clearer through examples and corrections, but that clarification does not survive the conversation in a reusable form.

The missing piece is not another universal mood label. It is a lightweight way to convey **“when I say this word, these songs fit, this one does not, and this is the distinction I care about”**—without making the listener produce a musicological explanation or requiring every friend to adopt the same definition.

## 3. Corroboration and limits of the evidence

### 3.1 Direct feedback on our project

The November 2026 Commons critique of our F1 pitch supplies preliminary, qualitative evidence about both the problem and its risks. **Amber Wu** explicitly reported that recommended songs labeled with a vibe often differ from her interpretation of that word. **Julia Kozak** likewise reported that Spotify's mood or vibe labels do not consistently match the sounds she expects. These are firsthand statements of dissatisfaction that resemble bad situation A. They are stronger evidence for the *experience of mismatch* than for any particular fix.

Other critiques identified limitations in our proposed approach rather than confirming existing harm. **Samantha Shih** described the case in which someone knows the song but cannot supply an appropriate descriptive word, and asked whether they could start from examples. **Estrella Cayuelas Solano** questioned whether explicitly stated associations add anything beyond what listening histories and playlists already convey. **Desire** questioned whether users will spend time teaching the system; **Ketevan Peranidze** raised onboarding and listening-platform friction. **Amber Wu** suggested allowing people to explain why a song was rejected. Those comments help us avoid assuming that a Sound Wall automatically solves the problem.

**Limit:** This was feedback from classmates reacting to a pitch, not a representative sample or an observational study. It cannot establish how often these failures occur, how much time they consume, or whether users would adopt our solution. The scenarios above therefore remain hypotheses to validate, not claimed observed incidents.

### 3.2 Research on subjective musical meaning

A 2022 study by **Juslin et al.** asked 44 participants about feelings and mechanisms associated with 72 music excerpts. It found that links between mechanisms and emotions differed partly among listeners. This supports the idea that an identical piece of music can elicit different responses for different people; it does **not** measure the frequency of failed conversations between friends. [1]

In a 2024 paper, **Moscati et al.** compared fine-grained emotion annotations with large-scale user-generated tags for music recommendation. Agreement between the two representations was often low, suggesting that a standardized or aggregate mood description should not be assumed to communicate every individual's interpretation. The study concerns annotation sources and recommender performance, however, not direct friend-to-friend communication. [2]

A review by **Schedl et al.** describes music recommendation as especially dependent on context, subjective emotional responses, and aspects of preference that are difficult to infer from simple user–song interactions. This supports our concern that a listening-history signal may not fully explain *why* one song fits a particular request. The review also recognizes substantial progress in existing recommendation systems; it is not evidence that they generally fail. [3]

Importantly, an earlier evaluation by **Schleith, Stumpf, and Kulesza** found that users slightly preferred an unstructured music recommender to a structured, user-tag-based alternative. This is a counterweight to our own hypothesis: asking users for more explicit labels and structure does not, by itself, guarantee better results. [4]

### 3.3 What the evidence currently supports

Taken together, the peer feedback and research support a **real interpretive mismatch** between musical labels and personal associations, and a plausible cost when those associations must be explained repeatedly. They do **not yet demonstrate** that the cost is frequent enough to justify another app, or that a saved vocabulary is preferable to sending two example songs in a message.

Before treating the problem as validated, we should observe friends completing a concrete recommendation task: ask a listener to communicate a sound using their usual method, record misunderstandings and corrections, then see whether a compact set of examples and exclusions improves the next attempt. We should also test people who *do not* experience this problem. The relevant question is not “would you like a Sound Wall?” but “what happened when you tried to make another person understand the sound you wanted?”

## 4. Workarounds and comparable solutions

| Existing approach | Why people use it and what it solves | What remains unresolved in our scenarios |
| --- | --- | --- |
| **Text messages, voice notes, and song links** | Immediate and familiar. Friends can discuss examples, ask questions, and respond in their own words. They may solve the entire problem in a single conversation. | Examples and corrections remain dispersed among unrelated messages. A new friend cannot easily see the particular distinctions the listener settled on, unless Maya reconstructs and resends them. |
| **Manually curated or collaborative playlists** | Playlists communicate several positive examples at once. Spotify's collaborative playlists let friends add, remove, and reorder tracks. [5] | A playlist shows which tracks belong together but may not reveal which qualities matter, which suggestions were rejected, or whether the playlist is an example of *Maya's dreamy* rather than *Jordan's dreamy*. |
| **Spotify Blend and listening-history-based recommendations** | Spotify Blend combines people's listening activity into a shared, automatically updated playlist. It reduces effort and can reveal overlapping taste. [6] | Its central input is listening behavior. A person's broad history may not express the particular definition they want to communicate for one occasion, and the other friend still may not know what the request's word means. |
| **Spotify AI Playlist / Prompted Playlist** | These tools already support natural-language prompts, personalization, and forms of prompt refinement. Prompted Playlist also provides explanatory notes and lets people share a prompt or playlist. [7] | These are strong alternatives for finding music. The narrower gap we want to test is communicating a *portable, example-anchored interpretation*—including counterexamples and revisions—to a friend rather than repeatedly writing a prompt. We should not claim that Spotify cannot understand moods or refine results. |
| **Last.fm personal tags** | Users can assign their own tags to tracks or artists, and the service exposes personal-tag features. This already demonstrates that a personal music vocabulary is not a new idea by itself. [8] | A tag can associate a word with a recording, but the workflow is not centered on explaining a single listener's meaning to a friend through *fitting examples, non-fitting examples, and targeted feedback*. |

The critical comparison is not whether our app can recommend more songs than Spotify or store more songs than a playlist. It is whether a listener can communicate the **boundary** of a personal description more accurately and with less repeated explanation than by sharing ordinary links, playlists, or prompts. If a short text message with two song links performs equally well, the proposed app has not demonstrated enough value.

## 5. Solution sketch: A shareable, revisable Sound Wall

**Sound It Out** would let someone preserve a small set of *personal sound definitions* on a **Sound Wall**. Each definition belongs to a listener rather than to a universal music taxonomy. For example, Maya's entry for *dreamy* might contain two songs that fit, a contrasting song that does not, and an optional note: “I mean layered synths and echoing voices, not necessarily soft or slow.” Someone who does not know the right word could start from a favorite song and add or choose a description afterward.

Instead of sending only “find me something dreamy,” Maya could share the relevant definition with Jordan. Jordan would see a few playable or externally linked examples and the distinction Maya cares about, then suggest a song against that context. Maya could say that it fits, that it does not, or briefly explain why. That response would update Maya's own definition **only with her approval**. The next friend would see her current explanation without needing the previous conversation.

This suggests three modest capabilities rather than a general-purpose music AI system:

1. **Express:** Associate a user-chosen word or feeling with a few positive examples, optional counterexamples, and an optional short reason; allow starting from a song instead of a word.
2. **Share and suggest:** Share one chosen definition with a friend, who can view the context and propose a song without taking ownership of the listener's definition.
3. **Refine and reuse:** Let the owner accept, reject, explain, revise, or remove associations so later suggestions are informed by the most current meaning.

The app would preserve song *references* and information supplied by users, not assume that an AI can reliably infer the emotional reason a track was chosen. A small initial catalogue of tracks with confirmed playback or linking rights, or external links that open on authorized music services, could support an initial prototype. We would not need to train an audio model or host unlicensed excerpts to show the core interaction. Spotify or other providers might be used where permitted, but access and licensing should be verified before committing to a playback integration; SoundCloud's public API, for example, restricts downloading and storing content. [9]

A useful result may be a human recommendation that fits better, even if no automated recommendation is involved. An optional later experiment could use the saved examples and reasons to rank a limited catalogue, but **automatic inference and large-scale discovery are not prerequisites for solving the communication problem**.

### How the sketch addresses the bad situations

| Failure | Proposed intervention | Observable sign of improvement |
| --- | --- | --- |
| Jordan interprets *dreamy* differently from Maya. | Jordan sees Maya's own fitting and non-fitting examples before suggesting anything. | Fewer clarification turns and a higher proportion of first-round suggestions Maya judges to fit. |
| A song link does not reveal which musical feature matters. | Maya can optionally say why an example fits or why a candidate misses. | Jordan can articulate the relevant distinction without needing another explanation. |
| Earlier clarifications disappear in a chat. | Maya keeps and revises a small definition she can share again. | A new friend can make an appropriate suggestion without reconstructing the earlier conversation. |
| Creating a definition takes too much effort. | Start from a song, keep explanations optional, and avoid requiring a complete vocabulary at signup. | People can complete a request without spending more effort than their usual workaround. |

## 6. Ethical analysis: Value-Sensitive Design

The core design choice—turning a private interpretation into a persistent, shareable object—creates benefits, but also changes who can inspect, influence, and reuse someone's music taste. We examined **stakeholders, time, pervasiveness, and values**, including effects on people who never sign up.

### 6.1 Stakeholders and their interests

| Stakeholder | Potential benefit | Potential harm or constraint |
| --- | --- | --- |
| **Listeners who create Sound Walls** (direct) | Communicate their intended sound, receive more fitting suggestions, and reflect on how their taste changes. | Emotional associations, identity cues, or disliked songs may be exposed. They may feel pressured to maintain a precise profile or explain private reasons. |
| **Friends asked to suggest songs** (direct or indirect, including non-users) | Understand a request more quickly, avoid frustrating guesses, and discover how a friend hears music. | They may feel obliged to register, contribute free curation work, or have a rejected suggestion interpreted as personal criticism. |
| **People represented in shared screenshots or forwarded links** (indirect) | A shared reference can help a wider group communicate a sound. | They may encounter personal notes or friend-attributed suggestions outside the audience originally intended, even if they never joined. |
| **Artists and rights holders** (indirect) | A more precise way to describe a sound may help listeners notice unfamiliar artists rather than only established genres. | Unauthorized excerpts, missing credit, or narrow source catalogues could exploit or exclude creators who never consented to the app. |
| **Listeners with different languages, cultures, or access needs** (potential users and non-users) | Personal terms can preserve interpretations that standardized genre and mood labels overlook. | An English-only vocabulary, audio-only comparisons, or a starter catalogue dominated by one musical tradition could disadvantage them. |
| **Maintainers and music-service providers** (indirect) | Clearly attributed outbound listening can complement existing services. | Hosting and moderation burdens, API restrictions, copyright claims, and a dependency on providers that may change access. |

### 6.2 VSD observations and design responses

**1. Stakeholders — Non-users should not have to join to help.** A shared Sound Wall benefits Maya only if Jordan can understand it, but Jordan may not want another account or an ongoing role as curator. A signup gate would shift the work onto someone who did not choose the tool. **Design response:** Allow read-only, link-based viewing and a lightweight suggestion path without mandatory registration. Make contribution optional and avoid automatically sending reminders. The tradeoff is less persistent attribution and weaker spam prevention for anonymous suggestions.

**2. Stakeholders and values — Sharing a sound can reveal more than musical taste.** A definition like *songs that remind me of home* may contain personal history that Maya intended only for one friend. Sharing her entire Sound Wall to request one suggestion could expose unrelated associations. **Design response:** Keep definitions private by default; let Maya share one selected entry, preview exactly what a recipient sees, revoke links, and delete her own annotations. Re-shared screenshots remain outside the app's control, so the UI should not promise perfect privacy.

**3. Values — Correction should improve understanding, not score friendship.** If Jordan recommends a song thoughtfully and Maya labels it “wrong,” a visible rejection count could embarrass Jordan and discourage future suggestions. Yet Maya needs to communicate what did not fit. **Design response:** Frame feedback as “doesn't fit *this sound*” rather than a judgment of the person; make detailed reasons optional and let the listener choose whether a reason is shared with the suggester. This limits social friction without hiding useful distinctions.

**4. Time — Today's definition must not become tomorrow's obligation.** Maya may later decide that the acoustic song she once rejected actually fits *dreamy*. If an old label silently governs every subsequent suggestion, the app would preserve outdated preferences just as efficiently as useful ones. **Design response:** Let the owner remove or change any association, see when a definition was last edited, and stop using removed examples for future matching. Never treat earlier feedback as an irrevocable statement of identity.

**5. Time and values — Reflection can become work.** At first, constructing a Sound Wall may help someone articulate a feeling. Over time, requests for elaborate explanations could make casual listening feel like labeling data. This pits expressive control against ease and enjoyment. **Design response:** Make a single positive example sufficient to begin, use optional prompts such as “what didn't fit?”, and allow users to send a plain song link instead. Extra structure should earn its place by saving effort later, not by becoming mandatory setup.

**6. Pervasiveness — A personal vocabulary could become a social standard.** If many people share Sound Walls, popular tags and examples might become defaults that pressure users to define *dreamy* or *hype* the same way. That would recreate the mismatch the project is meant to address, especially across musical cultures. **Design response:** Keep meanings owned and labeled by their creators, avoid global correctness scores or ranking people's definitions, and allow non-English or idiosyncratic terms. This preserves interpretive diversity at the cost of easier standardization.

**7. Pervasiveness and stakeholders — Widespread use can shape which artists get heard.** If the app repeatedly suggests only songs in its starter catalogue or from one provider, artists outside that catalogue receive fewer opportunities for discovery, even if their sound fits better. **Design response:** Attribute artists clearly, support legitimate external links from more than one service when feasible, and distinguish “not in our catalogue” from “not a match.” Do not copy or host copyrighted previews without permission. A small course prototype cannot promise equal representation across music ecosystems.

**8. Values — Openness conflicts with safety and autonomy.** A track may match a listener's desired sound but contain explicit lyrics, a slur, or a message they wish to avoid. A purely sound-based match would fail that listener and might expose them to upsetting material. **Design response:** Allow explicit-content preferences, preview warnings where trustworthy metadata exists, and an easy way to hide or report a suggestion. Do not present inferred lyrical safety as certain when the app lacks reliable data; stricter filtering may exclude some otherwise relevant music.

**9. Pervasiveness and values — Personalization can narrow exploration.** As definitions accumulate, the app might learn to show only very close copies of Maya's examples. That would reward immediate agreement but make discovery repetitive and disadvantage unusual music. **Design response:** Separate a strict “match my examples” mode from an optional “explore nearby sounds” mode, label which mode produced a suggestion, and leave novelty under user control. The app should not silently redefine the user's word to maximize engagement.

**10. Stakeholders and values — Accessible expression must not assume audio or English fluency.** A sound-first tool may rely on tiny playback buttons, inaccessible waveforms, and specialized musical adjectives. Blind, Deaf, hard-of-hearing, or multilingual participants may be excluded from sharing or interpreting examples. **Design response:** Provide keyboard-accessible controls, track names, text descriptions, visible focus, and text alternatives; do not make waveform interpretation or sophisticated terminology necessary to contribute. These affordances also help friends browsing in quiet or noisy places without audio.

### 6.3 Consequences over time and at scale

**In initial use**, saved examples could reduce misunderstandings, but the setup cost or discomfort of explicit feedback could outweigh the benefit. **After repeated use**, the same examples could save explanation time, while stale definitions or accumulating social obligations could make the system feel rigid. **At widespread adoption**, a service intended to preserve personal meaning could instead encourage performative taste profiles, common labels, or a restricted commercial catalogue. We therefore propose privacy-by-default, owner-controlled revision, optional participation, and no universal “correct” mood definitions as core constraints—not features to add only if problems appear later.

The opportunities are broader than more accurate playlists. Friends could gain a new vocabulary for appreciating each other's different experiences of the same music. Less conventional musical associations could remain legible instead of being forced into a standardized mood category. Those benefits depend on maintaining user ownership and making room for disagreement; they cannot be achieved by optimizing recommendation accuracy alone.

## 7. What we still need to validate

The project is promising, but the strongest unproven assumption is that **preserving the interpretation is worth more effort than sending ordinary song links**. To test that assumption, we plan to compare ordinary messaging with a simple prototype using the same recommendation task. A listener chooses a sound; a friend recommends songs without seeing the intended examples, then with a small set of positive examples, counterexamples, and optional explanations. We will observe rather than assume whether they understand each other better.

Useful measures include: the number of clarification turns; time until the listener accepts a fitting suggestion; the listener's rating of how well each suggestion matches the requested sound; the effort both people report; and whether a *different* friend can use the saved definition later without re-explanation. We should ask participants what parts of the examples they used and whether the wall made them feel better understood. A credible baseline is simply sending two song links and a sentence, not a deliberately weak text-only query.

We will also test the failure cases raised in peer critique: users who do not know which word to use, people who dislike extensive onboarding, suggestions they find inappropriate, and users who change their minds. A useful prototype should make those situations manageable even without a large recommendation model.

**Scope decision:** For F3 and the initial implementation, prioritize the *human communication loop*: create a personal definition, share it, receive a suggestion, and revise the definition. Automated discovery, playlist imports, large-scale audio understanding, and broad streaming-service integration can be evaluated later without making them dependencies of the core concept.

## References

[1] Juslin, P. N., Sakka, L. S., Barradas, G. T., & Lartillot, O. (2022). *Emotions, Mechanisms, and Individual Differences in Music Listening: A Stratified Random Sampling Approach.* Music Perception, 40(1), 55–86. https://doi.org/10.1525/mp.2022.40.1.55

[2] Moscati, M., Strauß, H., Jacobsen, P.-O., Peintner, A., Zangerle, E., Zentner, M., & Schedl, M. (2024). *Emotion-Based Music Recommendation from Quality Annotations and Large-Scale User-Generated Tags.* ACM UMAP. https://doi.org/10.1145/3627043.3659540

[3] Schedl, M., Zamani, H., Chen, C.-W., Deldjoo, Y., & Elahi, M. (2018). *Current challenges and visions in music recommender systems research.* International Journal of Multimedia Information Retrieval, 7, 95–116. https://link.springer.com/article/10.1007/s13735-018-0154-2

[4] Schleith, J., Stumpf, S., & Kulesza, T. (2012). *People-Powered Music: Using User-Generated Tags and Structure in Recommendations.* City University London. https://openaccess.city.ac.uk/id/eprint/1206/

[5] Spotify Support. *Collaborative playlists.* https://support.spotify.com/pw/article/collaborative-playlists/

[6] Spotify Support. *Social recommendations in playlists (Blend).* https://support.spotify.com/gy/article/social-recommendations-in-playlists/

[7] Spotify Support. *Prompted Playlists* and *AI Playlist.* https://support.spotify.com/us/article/prompted-playlists/ and https://support.spotify.com/to/article/ai-playlist/

[8] Last.fm API. *Personal tags* and *Track tags.* https://www.last.fm/api/show/user.getPersonalTags and https://www.last.fm/api/show/track.addTags

[9] SoundCloud Help Center. *SoundCloud Public APIs.* https://help.soundcloud.com/hc/en-us/articles/115003446727-SoundCloud-Public-APIs

**Primary course evidence:** November 2026 F1 Commons critique thread, “Music Discovery Team” (peer comments by Julia Kozak, Amber Wu, Desire, Ketevan Peranidze, Samantha Shih, Estrella Cayuelas Solano, and raleighb; available to course participants). See also the team's `mentor-meetings/nov10.md` for the decision to prioritize communication over broad discovery and its open feasibility questions.
