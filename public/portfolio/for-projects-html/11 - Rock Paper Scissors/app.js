let userScore = 0;
let computerScore = 0;

const choices = document.querySelectorAll('.choice');
const message = document.querySelector('#msg');
const userScoreParagraph = document.querySelector('#user-score');
const compScoreParagraph = document.querySelector('#computer-score');


const generateComputerChoice = () => {
    let options = ['rock', 'paper', 'scissors'];
    const randomIdx = Math.floor(Math.random() * 3);

    return options[randomIdx];
}

const showWinner = (userWin, userChoice, computerChoice) => {
    if (userWin) {
        console.log('You Win');
        userScore++;
        userScoreParagraph.innerText = userScore;
        message.innerText = `You Win, ${userChoice} beats ${computerChoice}`;
        message.style.backgroundColor = 'green';
    } else {
        console.log('You Lose');
        computerScore++;
        compScoreParagraph.innerText = computerScore;
        message.innerText = `You Lose, ${computerChoice} beats ${userChoice}`;
        message.style.backgroundColor = 'red';
    }

}

const playGame = (userChoice) => {
    // generate computer choice
    const computerChoice = generateComputerChoice();
    // console.log(userChoice, computerChoice);

    if (userChoice == computerChoice) {
        console.log('Draw Game');
        message.innerText = 'Draw Game, Play Again!';
    }
    else {
        let userWin = true;
        if (userChoice == 'rock') {
            userWin = computerChoice == 'paper' ? false : true;
        }
        else if (userChoice == 'paper') {
            userWin = computerChoice == 'scissors' ? false : true;
        }
        else {
            userWin = computerChoice == 'rock' ? false : true;
        }

        showWinner(userWin, userChoice, computerChoice);
    }
}

choices.forEach((choice) => {
    choice.addEventListener('click', () => {
        const userChoice = choice.getAttribute('id');
        // console.log('Choice made : ', userChoice);

        playGame(userChoice);
    })
})


















