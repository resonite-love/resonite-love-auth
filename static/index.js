let loggedIn = false

window.onload = async function () {
    // check if user is logged in
    const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    const data = await res.json()
    if (!res.ok) {
        console.log(data.message)
        loggedIn = false
        document.getElementById("message").innerText = "未ログイン"
    } else {
        loggedIn = true
        const user = await fetch('/api/user')
        const userData = await user.json()
        document.getElementById("message").innerText = JSON.stringify(userData, null, 2)
        document.getElementById("login").style.display = "none"
    }
}


// ユーザーIDを送って、認証コードをもらう
async function handleLoginRequest() {
    const userId = document.getElementById("userid").value;
    const res = await fetch("/api/loginRequest", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({userId: userId})
    })

    const result = await res.json()
    if (result.success) {
        document.getElementById("login").style.display = "none"
        document.getElementById("token-form").style.display = "block"
    }
}

// 認証コードを送って、tokenをもらう
async function handleTokenLogin() {
    const token = document.getElementById("token").value;
    const res = await fetch("/api/login", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({token: token})
    })

    const result = await res.json()
    if (result.success) {
        console.log(result)
        location.reload()
    } else {
        location.reload()
    }
}


// ログアウト
function handleLogout() {
    // remove cookie

}
