**Agenda:** topics to be discussed with time allocated to each
Explanation of bad situation and why we care about it: 5 minutes
Discuss ideas and potential concepts we would include in our solution: 15 minutes
Discuss risks, concerns, and feasibility of the solution: 15 minutes
Outline plan for next week: 5 minutes


**Project summary:** the bad situation you've identified and your solution ideas so far
Bad Situation: The bad situation we identified is that a listener's descriptions don't match their music recommendations due to the semantic gap between text and music. For example, a listener might have a completely different definition of what "dreamy" music is compared to a friend she asks for recommendations from or even the algorithm that tries to provide her recommendations. 
Solutions:
Creating a personal wall of song snippet to word associations that can receive suggestions from other users/friends via a link. Integration of that data into an llm to make recommendations with better context.

**Potential Features**
Personal Music Vocab: Users define their own definitions of words, like "dreamy", "nostalgic", "energetic"

Song Comparisons: Present two songs to users, ask them which one feels more XXX to you?

Annotating why a song fits: Users can identify whether a feeling comes from vocals, instrumentation, tempo, atmosphere, or something else. 

Personal Recommendations + refinement: Recommend songs based on a user's definitions. Let them provide quick feedback such as “fits,” “doesn't fit,” or “too similar to what I know.

Sharing Personal Definitions: Let friends compare what “dreamy” means to each of them or share collections of songs associated with a feeling.

**Issues:** problems and issues to address, with a sentence or two explaining each
Data prepopulation: How can we scrape royalty-free music to give users an initial selection of associations?
Model integration: Evaluating the accuracy with this new context vs preexisting solutions. Can we compete with Spotify in recommendation quality? 
Accessibility: How can we maintain quality for visually impaired users?
User Friction: How can we make inputting the users preferences as easy as possible?
Technical Implementation: How will we feed the data the user inputs on their soundwall into the model, so that it can provide the user with the best recommendations?


**Plans & decisions (completed after):** plans for next week and decisions made
