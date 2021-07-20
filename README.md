# State Connection Graph

This library allows following or subscribing state changes in application.
Any change on the state will be notified to subscribers, so subscribers can update theirselves accordingly.
Scalable state trees can be created by connecting them each other.

## Install 
For nodejs application it can be installed from npm:
```shell
$ npm install stateconnect
```

Then it can be imported with require:
```javascript
const {State} = require("stateconnect")
```

Or it can be directly imported from the path:
```javascript
const {State} = require("./path-to-module/stateconnect.cjs")
```


For web, it can also be imported from path. StateConnect relies on ES modules, any script that references it must use type="module" as shown below:
```javascript
<script type="module">
    import { State } from "./path-to-module/stateconnect.mjs"
</script>
```

## Node Usage

### Creating simple state:

```javascript
const { State } = require("stateconnect")

var userState = new State({
    username: 'johndoe',
    email: 'johndoe@example.com',
    membership: 'basic'
});

// Subscribe to changes on userState, this way we'll be notified any time nameState is changed.
userState.subscribe((state) => {
    console.log(`User has been updated:\n`, state.get());
});

// Change membership
userState.set({
    ...userState.get(), 
    membership: 'platinium'
});
// Output: User has been updated: 
// {
//     username: 'johndoe',
//     email: 'johndoe@example.com',
//     membership: 'platinium'
// }
```

We create state by just giving an initial value. In this case we have user object which holds our user properties. When we set new value to userState, subscriber is notified and prints new user object. It passes state itself as a parameter to subscribe function. This way we can get state value inside the function scope.

### Connecting states and setting custom computation:
We are not limited to one state object that holds all states. We can create micro states for each property and connect them to one final state. This way whenever micro state is changed, final state will update itself automatically and return array that holds all connected values by connection order. This will allow us freedom to update micro states individually without touching other states and prevent accidental value updates for other states.

```javascript
var usernameState = new State("johndoe");
var emailState = new State("johndoe@example.com");
var membershipState = new State("basic");

var userState = new State();
userState.addHook(usernameState, emailState, membershipState);

console.log(userState.get());
// [ 'johndoe', 'johndoe@example.com', 'basic' ]
```

We can also set custom computation function. This way when final state will update itself by the given compute function.

```javascript
userState.setComputeFn((username, email, membership) => {
    console.log("Computed.");
    return {
        username,
        email,
        membership
    };
});

console.log(userState.get());
// Output: Computed.
// {
//     username: 'johndoe',
//     email: 'johndoe@example.com',
//     membership: 'basic'
// }

membershipState.set('platinium')
console.log(userState.get());
// Output:  Computed.
// {
//     username: 'johndoe',
//     email: 'johndoe@example.com',
//     membership: 'platinium'
// }
```

Compute function will receive all connected state values as parameter with the connection order. In this example `setComputeFn` passes usernameState, emailState and membershipState as parameter since these are the only connected states.

Another thing is StateConnect uses lazy evaluation algorithm. It means value won't be computed until it is called. It will be computed only once at the first call. Any other consecutive calls will receive cached value. This saves lots of computation power and time if app has heavy calculations or has too many states. If we try to call userstate again you'll notice that it wont print 'Computed.' again since its calling it from cache.

```javascript
// It will return the cached value since nothing is changed and wont print 'Computed.'.
console.log(userState.get());
// Output:
// {
//     username: 'johndoe',
//     email: 'johndoe@example.com',
//     membership: 'platinium'
// }
```
### Undo/Redo history:
StateConnect has built-in undo manager and enabled by default. It can be set by changing static `withUndo` variable. Also history limit can be changed from static undokit object stored in the State. Please check [UndoKit](https://github.com/firatkiral/UndoKit) library for more info about undo management.
```javascript
State.withUndo = true
State.undoKit.setLimit(150)
```

All actions can be undone and redone simply by calling static undo and redo functions as shown below.
```javascript
State.undo();
console.log("Action undone: \n",userState.get());
// Output: Computed.
// Action undone:
//  {
//   username: 'johndoe',
//   email: 'johndoe@example.com',
//   membership: 'basic'
// }

State.redo();
console.log("Action redone: \n",userState.get());
// Output: Computed.
// Action redone:
//  {
//   username: 'johndoe',
//   email: 'johndoe@example.com',
//   membership: 'platinium'
// }
```

 ### Async computation:
StateConnect supports async computations where application needs to do some server side calls etc. that requires async operation. We achieve this by using `setComputeAsyncFn` and `getAsync` functions as shown below.

```javascript
var userIdState = new State("usr324563");
var userObjAsyncState = new State();
userIdState.connect(userObjAsyncState)

userObjAsyncState.setComputeAsyncFn((userId) => {
    return new Promise((resolve, reject) => {
        // Assume we made server call and received new user object
        setTimeout(() => {
            resolve({
                uId: "usr324563",
                firstname: "John",
                lastname: "Doe"
            });
        }, 2000);
    });
});

userObjAsyncState.getAsync().then((res) => {
    console.log("resultAsync: ", res);
});
// Output: resultAsync:  { uId: 'usr324563', firstname: 'John', lastname: 'Doe' }
```

Compute function must return promise object as shown above. `setTimeout` function is used here for test purposes to simulate server call delay. We call async state values by getAsync function.

## Web Usage