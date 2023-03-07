import { Component, OnInit } from '@angular/core'
import { ContactsService } from 'src/app/services/contacts/contacts.service'

@Component({
  selector: 'airgap-contact-book-onboarding',
  templateUrl: './contact-book-onboarding.page.html',
  styleUrls: ['./contact-book-onboarding.page.scss']
})
export class ContactBookOnboardingPage implements OnInit {
  public suggestionsEnabled: boolean
  public state: 0 | 1 | 2

  constructor(private readonly contactsService: ContactsService) {
    this.state = 0
  }

  async ngOnInit(): Promise<void> {
    this.contactsService.isSuggestionsEnabled().then((value: boolean) => (this.suggestionsEnabled = value))
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

  async onToggleSuggestion(event: any) {
    const value = event.detail.checked
    await this.contactsService.setSuggestionsEnable(value)
  }
}
