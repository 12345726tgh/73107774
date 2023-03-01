import { Component } from '@angular/core'

@Component({
  selector: 'airgap-contact-book-onboarding',
  templateUrl: './contact-book-onboarding.page.html',
  styleUrls: ['./contact-book-onboarding.page.scss']
})
export class ContactBookOnboardingPage {
  state: 0 | 1 | 2
  constructor() {
    this.state = 0
  }

  changeState(state: 0 | 1 | 2) {
    this.state = state
  }

  next() {
    if (this.state < 2) this.state++
    else console.log('next route')
  }

  prev() {
    if (this.state > 0) this.state--
    else console.log('prev route')
  }

  toggle() {
    console.log('toggle recommendation service')
  }
}
