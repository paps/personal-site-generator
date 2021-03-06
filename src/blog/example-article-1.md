---
title: Example article 1 & syntax highlight <s>huh?</s>
type: article
published: true
created: 2021-08-18
updated: 2021-08-19

---

Example 1

This is C code from redis:

```c
void aeDeleteFileEvent(aeEventLoop *eventLoop, int fd, int mask)
{
    if (fd >= eventLoop->setsize) return;
    aeFileEvent *fe = &eventLoop->events[fd];
    if (fe->mask == AE_NONE) return;

    /* We want to always remove AE_BARRIER if set when AE_WRITABLE
     * is removed. */
    if (mask & AE_WRITABLE) mask |= AE_BARRIER;

    aeApiDelEvent(eventLoop, fd, mask);
    fe->mask = fe->mask & (~mask);
    if (fd == eventLoop->maxfd && fe->mask == AE_NONE) {
        /* Update the max fd */
        int j;

        for (j = eventLoop->maxfd-1; j >= 0; j--)
            if (eventLoop->events[j].mask != AE_NONE) break;
        eventLoop->maxfd = j;
    }
}
```
*Captioning is not supported for code blocks :(*

And this is inlined code: `if (mask & AE_WRITABLE) mask |= AE_BARRIER;`. And this as well: `for (j = eventLoop->maxfd-1; j >= 0; j--) if (eventLoop->events[j].mask != AE_NONE) break; eventLoop->maxfd = j;`. Nice!

EOF
