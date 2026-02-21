# S2jsphere
This is a JavaScript conversion of the python S2 library [S2sphere](https://github.com/sidewalklabs/s2sphere). The "j" was added to the library name to signify JavaScript.

All tests work exactly the same as those downloaded from the Python project - one fails exactly the same way in the Python source and my JavaScript version.

## Using S2jsphere
To be added

## History of S2jsphere:
For a long time the only S2 library publically available in JavaScript was a very limited version. There are several versions of this library which all appear to derive from the same source, although the credits are not clear. This is the oldest I have identified: https://github.com/jonatkins/s2-geometry-javascript and I believe is likely to be the original given the timing.

The library was written at a time JavaScript did not have BigInt and could not handle the cell IDs. It was possible to uniquely identify the S2 cells using a combination of the face and the valiues of i and j - but this created issues when trying to work with standard S2 libraries. It was also written around the time Niantic Labs (a Google start-up) launched their first AR game, Ingress. Ingress players were interested in the S2 cells as they were used for scoring data in the game, and there were a group of players working on improving game players' access to mapping tools to help them understand and work with the global nature of the game. Interest in S2 cells grew when Niantic launched their more famous game, Pokemon Go, which was found to use the S2 geometry to decide locations of Pokestops and gyms, weather effects, no-play zones and many other mapping decisions.

Although I was aware of S2 geometry and its links with Niantic's AR games, it wasn't until 2020 I started examining it more closely, but I was limited in my understanding as I was focussed on browser usage and the early JavaScript versions of the library. It wasn't until 2023 that I found the Python S2sphere library and realised that converting it to JavaScript had become a more approachable task. At the time I did this, I do not believe there were any other modern/complete Javascript versions of the S2 library, otherwise I probably would not have undertaken the task!

This was also my first foray into using LLMs to give some coding help. 2023, ChatGPT was able to turn small chunks of the Python code into something resembling JavaScript, but a lot of work was required to go through and implement library functions that don't exist in JAvascript, correct mistakes, unite the separate chunks, and pick up bugs. Converting all the tests as well as the actual library helped to identify the most serious issues, although a lot of syntax itself was wrong. 

I hit a particular problem with a failing test - but the test fails with exactly the same output values in the Python source. Avenues to investigate include looking at the C++ source behind the Python version or trying to run the tests on a different OS as it looks like handling of numbers with large levels of precision could be the issue. In addition, there is probably still room to further improve and optimise the code.


