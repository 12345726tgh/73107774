import { Component } from '@angular/core'
import { ErrorCategory, handleErrorLocal } from 'src/app/services/error-handler/error-handler.service'
import { NavigationService } from 'src/app/services/navigation/navigation.service'
import { AddType, ContactType } from '../contact-book-contacts/contact-book-contacts.page'

@Component({
  selector: 'airgap-contact-book-contacts-detail',
  templateUrl: './contact-book-contacts-detail.page.html',
  styleUrls: ['./contact-book-contacts-detail.page.scss']
})
export class ContactBookContactsDetailPage {
  public addEnum: typeof AddType = AddType

  public state: 'view' | 'new' | 'edit' = 'new'
  public contact: ContactType | undefined
  constructor(private readonly navigationService: NavigationService) {}

  ionViewWillEnter() {
    const state = this.navigationService?.getState()
    if (state.isNew) this.state = 'new'
    else if (state.isEdit) this.state = 'edit'
    else if (state.contact) {
      this.state = 'view'
      this.contact = state.contact
    }
  }

  onClickBack() {
    this.navigationService.route('/contact-book-contacts').catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))
  }

  onClickCancel() {
    if (this.state === 'new') this.navigationService.route('/contact-book-contacts').catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))
    else this.state = 'view'
  }

  onClickEdit() {
    this.state = 'edit'
  }

  onClickDelete() {
    console.log('delete')
  }
}
